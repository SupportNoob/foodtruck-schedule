const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Password (SHA-256 hash of "Loop123") ─────────────────────────────────────
// To change your password: node -e "const c=require('crypto');console.log(c.createHash('sha256').update('YOURPASSWORD').digest('hex'))"
// Then replace the hash below and set ADMIN_HASH in your Render environment variables.
const ADMIN_HASH = process.env.ADMIN_HASH || 'ea0d7e719e7a5cfc1f817d97bab22156da439145483a801c0c00ad3de36ee669';

// ── Paths ─────────────────────────────────────────────────────────────────────
const PUBLIC_DIR   = path.join(__dirname, 'public');
const MENUS_DIR    = path.join(PUBLIC_DIR, 'menus');
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');

// Ensure menus folder exists
if (!fs.existsSync(MENUS_DIR)) fs.mkdirSync(MENUS_DIR, { recursive: true });

// ── Schedule helpers ──────────────────────────────────────────────────────────
function readSchedule() {
  try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); }
  catch { return { properties: [], trucks: [] }; }
}
function writeSchedule(data) {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(data, null, 2));
}

// ── Multer (image uploads) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MENUS_DIR),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|jpg)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG/PNG images allowed'));
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ft-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 4 * 60 * 60 * 1000 } // 4-hour session
}));
app.use(express.static(PUBLIC_DIR));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash === ADMIN_HASH) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Incorrect password' });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/session — check if still logged in
app.get('/api/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// GET /api/schedule — public
app.get('/api/schedule', (req, res) => {
  res.json(readSchedule());
});

// POST /api/properties — admin only
app.post('/api/properties', requireAdmin, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Property name required' });
  const data = readSchedule();
  const id = 'prop_' + Date.now();
  data.properties.push({ id, name: name.trim(), color: color || '#ccaa55' });
  writeSchedule(data);
  res.json({ success: true, id });
});

// POST /api/trucks — admin only, handles image upload
app.post('/api/trucks', requireAdmin, upload.single('menu'), (req, res) => {
  const { name, cuisine, property, date, time } = req.body;
  if (!name || !date || !property) return res.status(400).json({ error: 'Name, date and property are required' });
  const data = readSchedule();
  const menuFile = req.file ? req.file.filename : null;
  const truck = {
    id: Date.now(),
    name:     name.trim(),
    cuisine:  (cuisine || 'Food Truck').trim(),
    property,
    date,
    time:     (time || 'TBD').trim(),
    menu:     menuFile
  };
  data.trucks.push(truck);
  writeSchedule(data);
  res.json({ success: true, truck });
});

// DELETE /api/trucks/:id — admin only
app.delete('/api/trucks/:id', requireAdmin, (req, res) => {
  const data = readSchedule();
  const id = parseInt(req.params.id);
  const truck = data.trucks.find(t => t.id === id);
  if (!truck) return res.status(404).json({ error: 'Not found' });
  // Remove image file if exists
  if (truck.menu) {
    const imgPath = path.join(MENUS_DIR, truck.menu);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  data.trucks = data.trucks.filter(t => t.id !== id);
  writeSchedule(data);
  res.json({ success: true });
});

// ── Catch-all: serve index.html ───────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => console.log(`🚚 Food Truck server running on port ${PORT}`));
