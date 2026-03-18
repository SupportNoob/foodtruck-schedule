# Food Truck Schedule — Alturas Capital Partners

## Folder Structure
```
foodtruck/
├── server.js          ← Node.js backend
├── package.json
├── schedule.json      ← Auto-updated by the admin panel
├── render.yaml        ← Render.com deployment config
├── public/
│   ├── index.html     ← The website
│   └── menus/         ← Uploaded menu images stored here
```

## Deploy to Render.com (Free)

1. Create a free account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or upload a ZIP)
4. Render auto-detects render.yaml and sets everything up
5. Your site will be live at: https://yourapp.onrender.com

## Change Your Password

Run this in your terminal:
```
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('YOURNEWPASSWORD').digest('hex'))"
```
Then update ADMIN_HASH in your Render environment variables.

## Admin Access
- Visit your site URL
- Scroll to the bottom → click "Admin Access"
- Enter password: Loop123
- You can now add/remove truck visits
