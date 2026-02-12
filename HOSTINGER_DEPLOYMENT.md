# Hostinger Deployment Guide

## What to Upload

Upload the **entire project folder** (after running `npm run build`) to Hostinger with this structure:

```
public_html/ (or your domain root)
├── app.js
├── .htaccess
├── .env
├── package.json
├── package-lock.json
├── dist/
│   ├── index.js
│   ├── config/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── types/
│   └── utils/
└── node_modules/ (install on server or upload if needed)
```

## Deployment Steps

### Option 1: Using Hostinger's File Manager (Recommended)

1. **Prepare locally:**
   ```bash
   npm run build
   ```

2. **Create a zip file with these contents:**
   - app.js (new file - create it)
   - .htaccess (new file - create it)
   - .env (update with production values)
   - package.json
   - package-lock.json
   - dist/ folder
   - node_modules/ folder (optional - install on server if space is limited)

3. **Upload to Hostinger:**
   - Via File Manager: Upload the zip to `public_html` and extract
   - Via FTP: Upload files directly to `public_html`

4. **Install dependencies on Hostinger (if not uploaded):**
   - SSH into Hostinger (if available)
   - Navigate to `public_html`
   - Run: `npm install`

5. **Update .env for production:**
   - Change `NODE_ENV=production`
   - Update `PORT=8080` (or check Hostinger's port)
   - Update `CLIENT_URL` to your production domain
   - Update database credentials for production DB

### Option 2: Using SSH/Terminal (If available)

```bash
# SSH into Hostinger
ssh user@yourserver.com

# Navigate to public_html
cd public_html

# Clone or upload files, then:
npm install
npm run build

# The app should start automatically
```

## Important Notes

- **PORT:** Hostinger typically uses port 8080 or assigns a random port. Check your Hostinger panel for the correct port.
- **Environment Variables:** Ensure all production credentials are in .env
- **Node.js Version:** Make sure Hostinger has Node.js installed (check in Hostinger control panel)
- **Restart:** The app may need to be restarted from Hostinger's control panel

## Troubleshooting

If you still get "folder structure not supported":
- Ensure .env file is present at root level
- Check that app.js is at the root
- Verify dist/ folder contents are correct
- Ask Hostinger support if Node.js is enabled for your hosting plan
