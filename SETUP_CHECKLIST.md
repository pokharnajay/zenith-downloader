# Setup Checklist - Docker Hub Deployment

Follow this checklist to get your app deployed using Docker Hub.

---

## ✅ Part 1: Initial Setup (One-time)

### 1. Docker Hub Account
- [x] Created Docker Hub account at https://hub.docker.com
- [x] Username: `jaypokharna`

### 2. Local Docker Setup
- [ ] Install Docker Desktop on your Mac
  - Download from: https://www.docker.com/products/docker-desktop/
  - Or use: `brew install --cask docker`
- [ ] Start Docker Desktop
- [ ] Verify Docker is running: `docker --version`

### 3. Docker Hub Login
- [ ] Login to Docker Hub from terminal:
  ```bash
  docker login
  # Username: jaypokharna
  # Password: [your Docker Hub password]
  ```

---

## 🚀 Part 2: First Build and Push

### 1. Test Local Build (Optional but Recommended)
```bash
# Navigate to project directory
cd "/Users/jaypokharna/Desktop/Shared Folder/Shared Folder/zenith-downloader (1)"

# Test build locally
docker build -t zenith-downloader-test .

# If build succeeds, you're good to go!
```

### 2. Build and Push to Docker Hub
```bash
# Use the automated script
./build-and-push.sh
```

**What happens:**
- ✅ Builds Docker image with all your code
- ✅ Tags with `latest` and timestamp
- ✅ Pushes to Docker Hub (jaypokharna/zenith-downloader)
- ✅ Available for deployment worldwide!

### 3. Verify on Docker Hub
- [ ] Go to https://hub.docker.com/r/jaypokharna/zenith-downloader
- [ ] Check that the image is there with `latest` tag
- [ ] Note the size and timestamp

---

## 🌐 Part 3: Deploy on Server (DigitalOcean Example)

### 1. Create DigitalOcean Droplet
- [ ] Create account at https://digitalocean.com
- [ ] Create Droplet:
  - Image: Ubuntu 22.04 LTS
  - Plan: Basic ($6/month is enough)
  - Data center: Choose closest to your users
  - Authentication: SSH key (recommended) or password
- [ ] Note the IP address: `___.___.___.___`

### 2. SSH into Server
```bash
ssh root@YOUR_SERVER_IP
```

### 3. Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Verify
docker --version
```

### 4. Create Project Directory
```bash
mkdir -p /opt/zenith-downloader
cd /opt/zenith-downloader
```

### 5. Create docker-compose.yml
```bash
nano docker-compose.yml
```

Paste this:
```yaml
services:
  web:
    image: jaypokharna/zenith-downloader:latest
    container_name: zenith-downloader
    restart: unless-stopped
    ports:
      - "80:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Save: `Ctrl+X`, `Y`, `Enter`

### 6. Create .env File
```bash
nano .env
```

Add:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Save: `Ctrl+X`, `Y`, `Enter`

### 7. Pull and Start
```bash
# Pull image from Docker Hub
docker pull jaypokharna/zenith-downloader:latest

# Start container
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 8. Access Your App
- [ ] Open browser: `http://YOUR_SERVER_IP`
- [ ] Test video download
- [ ] Verify everything works!

---

## 🔄 Part 4: Making Updates

### When you make code changes:

**Step 1: Local Machine**
```bash
# Make your edits
# ... edit files ...

# Build and push new version
./build-and-push.sh
```

**Step 2: Each Server**
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update to latest version
cd /opt/zenith-downloader
docker pull jaypokharna/zenith-downloader:latest
docker-compose up -d

# Verify
docker-compose logs -f
```

**That's it!** Your server now runs the latest code.

---

## 📋 Quick Command Reference

### Local Machine Commands
```bash
# Build and push to Docker Hub
./build-and-push.sh

# Test locally without Docker Hub
npm run dev

# Check Docker images
docker images | grep zenith
```

### Server Commands
```bash
# Update to latest
docker pull jaypokharna/zenith-downloader:latest
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart
docker-compose restart

# Stop
docker-compose down
```

---

## 🎯 Next Steps After Setup

1. **Set up a domain** (optional but recommended)
   - Point your domain to server IP
   - Set up SSL with Cloudflare or Let's Encrypt

2. **Deploy on multiple servers**
   - Repeat Part 3 on Google Cloud, AWS, etc.
   - Use same Docker Hub image everywhere!

3. **Automate updates** (advanced)
   - Set up GitHub Actions to auto-build on commit
   - Auto-deploy to servers with webhooks

4. **Monitor your app**
   - Set up uptime monitoring (UptimeRobot, etc.)
   - Configure log aggregation

---

## ❓ Troubleshooting

### Docker Desktop not starting?
```bash
# macOS
killall Docker && open /Applications/Docker.app

# Check system resources
docker info
```

### Build fails?
```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker build --no-cache -t jaypokharna/zenith-downloader:latest .
```

### Can't login to Docker Hub?
```bash
# Logout and login again
docker logout
docker login
```

### Server can't pull image?
```bash
# Check internet
ping hub.docker.com

# Try manual pull
docker pull jaypokharna/zenith-downloader:latest
```

---

## 📚 Reference Documents

- **[README.md](./README.md)** - Project overview and features
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[DOCKER_HUB_WORKFLOW.md](./DOCKER_HUB_WORKFLOW.md)** - Complete Docker Hub workflow
- **[.env.example](./.env.example)** - Environment variables template

---

## 🎉 Success Criteria

You're done when:
- ✅ Docker image is on Docker Hub
- ✅ App is running on at least one server
- ✅ You can access it via browser
- ✅ Video downloads work correctly
- ✅ You can update by running `./build-and-push.sh` + pulling on servers

**Need help?** Check the troubleshooting section or the detailed guides above!
