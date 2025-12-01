# 🍪 Cookie Management Guide

This guide explains how to manage YouTube cookies for Zenith Downloader using the built-in admin panel.

## Table of Contents
- [Why Cookies Are Needed](#why-cookies-are-needed)
- [Quick Start](#quick-start)
- [Admin Panel Features](#admin-panel-features)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Why Cookies Are Needed

YouTube uses bot detection that can block yt-dlp with errors like:
- "Sign in to confirm you're not a bot"
- "This video is age restricted"

Cookies from a logged-in YouTube session bypass these restrictions.

---

## Quick Start

### 1. Set Admin Password

First, set a strong admin password in your `.env` file:

```bash
ADMIN_PASSWORD=your_strong_password_here
```

Then restart your container:

```bash
docker-compose restart
```

### 2. Export YouTube Cookies

**Using Chrome Extension (Recommended):**

1. Install [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Log into YouTube in Chrome
3. Visit any YouTube page (e.g., youtube.com)
4. Click the extension icon
5. Click "Export" → Save as `cookies.txt`

**Alternative Methods:**

- [Firefox: Export Cookies](https://addons.mozilla.org/en-US/firefox/addon/export-cookies-txt/)
- [Manual Export](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)

### 3. Upload via Admin Panel

1. Go to `http://your-domain/admin` (or `http://localhost/admin` for local)
2. Enter your admin password
3. Drag and drop `cookies.txt` or click to select
4. Click "Upload Cookies"
5. Done! ✅ No restart needed

---

## Admin Panel Features

Access at: `http://your-domain/admin`

### Cookie Status Dashboard

View real-time cookie information:
- ✅ File exists or not
- 📅 Last modified timestamp
- ⏰ Age in days (warns if > 30 days)
- 📊 File size
- 🧪 Validation status

### Upload Cookies

- Drag & drop interface
- Instant validation
- Format checking
- No container restart required

### Test Cookies

Click "Test Cookies" to validate against YouTube:
- Tests with a real YouTube video
- Shows if cookies are working
- Takes ~10 seconds
- Clear success/error messages

### Delete Cookies

Remove cookies if:
- Testing without authentication
- Cookies are compromised
- Need fresh start

**⚠️ Warning:** Deleting cookies may cause bot detection errors on protected videos.

---

## Troubleshooting

### "Unauthorized - Invalid admin password"

**Problem:** Admin password is incorrect or not set.

**Solution:**
1. Check `.env` file has `ADMIN_PASSWORD=your_password`
2. Restart container: `docker-compose restart`
3. Clear browser cache and try again

### "Invalid cookie format"

**Problem:** The uploaded file is not a valid Netscape cookie file.

**Solution:**
1. Re-export cookies using the browser extension
2. Ensure you're exporting from YouTube.com (not other sites)
3. Don't manually edit the cookie file

### "Cookies are invalid or expired"

**Problem:** YouTube has rotated your session cookies.

**Solution:**
1. Log out of YouTube in your browser
2. Log back in
3. Re-export cookies
4. Upload new cookies via admin panel

### "Test failed: timeout"

**Problem:** yt-dlp took too long to respond (>10 seconds).

**Solution:**
- Try again (might be network issue)
- Check server internet connection
- Check yt-dlp is installed: `docker exec zenith-downloader yt-dlp --version`

### Downloads Still Failing

**Problem:** Even with cookies, downloads fail.

**Solution:**
1. Test cookies in admin panel (click "Test Cookies")
2. Check cookie age (if > 30 days, refresh)
3. Verify you're logged into YouTube when exporting
4. Try exporting in Incognito mode then logging in fresh

---

## Security Best Practices

### Password Security

- Use a strong, unique password (12+ characters)
- Don't reuse passwords from other services
- Store password securely (password manager)
- Change password if compromised

### Cookie Security

- **Never commit cookies to Git** (already in `.gitignore`)
- **Don't share cookie files** (they contain your session)
- **Use HTTPS** in production (cookies transmitted during upload)
- **Rotate regularly** (every 30 days)

### Network Security

For production deployments:

1. **Enable HTTPS:**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

2. **Firewall rules:**
   - Only allow ports 80/443
   - Block direct access to port 3000

3. **Rate limiting:**
   - Implement at reverse proxy level
   - Prevent brute force on `/admin`

---

## How It Works

### Storage

- Cookies stored in Docker volume: `zenith-data`
- Path inside container: `/app/data/cookies.txt`
- Persists across restarts and rebuilds
- Proper file permissions (nextjs user can read/write)

### Smart Cookie Usage

The app uses cookies intelligently:

1. **Try without cookies first** (most videos work)
2. **Use cookies only if needed** (bot detection triggered)
3. **Clear error messages** (tells users when cookies needed)
4. **Automatic fallback** (graceful degradation)

### Cookie Validation

When testing cookies, the app:
1. Runs yt-dlp with your cookies
2. Tries to fetch metadata for a test video
3. Checks for error patterns (bot detection, expired cookies)
4. Reports success or specific error

---

## Advanced Usage

### Manual Cookie Management (Docker CLI)

If you need to manage cookies via command line:

**Check if cookies exist:**
```bash
docker exec zenith-downloader ls -lh /app/data/cookies.txt
```

**View cookie age:**
```bash
docker exec zenith-downloader stat /app/data/cookies.txt
```

**Delete cookies:**
```bash
docker exec zenith-downloader rm /app/data/cookies.txt
```

**Copy cookies out of container:**
```bash
docker cp zenith-downloader:/app/data/cookies.txt ./cookies-backup.txt
```

### Backup Cookies

To backup your cookies:

```bash
# Create backup
docker cp zenith-downloader:/app/data/cookies.txt ./cookies-backup-$(date +%Y%m%d).txt

# Restore from backup
# Use admin panel to upload the backup file
```

### Multiple Accounts

To use cookies from different YouTube accounts:

1. Export cookies while logged into Account A
2. Upload via admin panel
3. When switching accounts:
   - Delete old cookies
   - Export new cookies from Account B
   - Upload new cookies

---

## API Reference

For developers integrating with the admin API:

### Upload Cookies
```http
POST /api/admin/upload-cookies
Authorization: Bearer YOUR_ADMIN_PASSWORD
Content-Type: multipart/form-data

cookies: <file>
```

### Get Cookie Status
```http
GET /api/admin/cookie-status
Authorization: Bearer YOUR_ADMIN_PASSWORD

# Add ?test=true to validate cookies
GET /api/admin/cookie-status?test=true
```

### Delete Cookies
```http
DELETE /api/admin/upload-cookies
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

---

## FAQ

**Q: How often should I update cookies?**
A: Every 30 days or when you see authentication errors.

**Q: Can I use cookies from a brand account?**
A: Yes, as long as you're logged in when exporting.

**Q: Do I need a YouTube Premium account?**
A: No, a free account works fine.

**Q: Will this bypass geo-restrictions?**
A: No, cookies only bypass bot detection. Use a VPN for geo-restrictions.

**Q: Is this against YouTube's Terms of Service?**
A: This is for personal use downloading your own content or public videos. Don't violate copyright.

**Q: Can multiple users share one cookie file?**
A: Yes, but all downloads appear to be from that YouTube account.

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Check application logs: `docker logs zenith-downloader`
3. Test cookies in admin panel
4. Verify admin password is set correctly
5. Open an issue on GitHub with error details
