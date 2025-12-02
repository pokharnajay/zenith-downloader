# Docker Hub Workflow Guide

This guide explains how to build, push, and deploy your Youtube Downloader using Docker Hub.

---

## 📦 Overview

**Docker Hub Workflow:**
1. Make code changes locally
2. Build and push to Docker Hub (your machine)
3. Pull and deploy on servers (DigitalOcean, Google Cloud, etc.)

**Benefits:**
- ✅ Build once, deploy anywhere
- ✅ Fast deployment (no build time on servers)
- ✅ Easy rollback to previous versions
- ✅ Consistent across all environments

---

## 🚀 Part 1: Building and Pushing (Your Local Machine)

### Step 1: Make Your Code Changes

Edit any files in your project as needed.

### Step 2: Build and Push to Docker Hub

**Option A: Using the Automated Script (Recommended)**

```bash
# Run the build and push script
./build-and-push.sh
```

This script will:
1. Build the Docker image
2. Tag it with `latest` and a timestamp
3. Login to Docker Hub
4. Push both tags to Docker Hub

**Option B: Manual Commands**

```bash
# Build the image
docker build -t jaypokharna/Youtube-downloader:latest .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push jaypokharna/Youtube-downloader:latest
```

### Step 3: Verify on Docker Hub

1. Go to https://hub.docker.com/
2. Click on your repository: `jaypokharna/Youtube-downloader`
3. You should see the new image with the `latest` tag

---

## 🌐 Part 2: Deploying on Servers

### First Time Deployment

SSH into your server and follow these steps:

```bash
# 1. Create project directory
mkdir -p /opt/Youtube-downloader
cd /opt/Youtube-downloader

# 2. Create docker-compose.yml
nano docker-compose.yml
```

Paste this content:
```yaml
services:
  web:
    image: jaypokharna/Youtube-downloader:latest
    container_name: Youtube-downloader
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

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

```bash
# 3. Create .env file
nano .env
```

Add your environment variables:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Save and exit.

```bash
# 4. Pull and start the container
docker pull jaypokharna/Youtube-downloader:latest
docker-compose up -d

# 5. Verify it's running
docker-compose ps
docker-compose logs -f
```

### Updating Existing Deployment

When you push a new image to Docker Hub, update your servers:

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Navigate to project directory
cd /opt/Youtube-downloader

# Pull latest image
docker pull jaypokharna/Youtube-downloader:latest

# Recreate container with new image
docker-compose up -d

# Check logs
docker-compose logs -f
```

**That's it! Your server now runs the latest version.**

---

## 🔄 Complete Update Workflow

### Scenario: You made changes and want to update all servers

**Step 1: Local Machine**
```bash
# Make your code changes
# ... edit files ...

# Build and push to Docker Hub
./build-and-push.sh
```

**Step 2: Server 1 (DigitalOcean)**
```bash
ssh root@digitalocean-ip
cd /opt/Youtube-downloader
docker pull jaypokharna/Youtube-downloader:latest
docker-compose up -d
exit
```

**Step 3: Server 2 (Google Cloud)**
```bash
ssh root@google-cloud-ip
cd /opt/Youtube-downloader
docker pull jaypokharna/Youtube-downloader:latest
docker-compose up -d
exit
```

**Step 4: Server N (Any other server)**
```bash
ssh root@server-n-ip
cd /opt/Youtube-downloader
docker pull jaypokharna/Youtube-downloader:latest
docker-compose up -d
exit
```

---

## 📋 Quick Reference Commands

### Local Development

```bash
# Test locally (without Docker Hub)
npm install
npm run dev

# Build Docker image locally
docker build -t Youtube-downloader-local .

# Run locally with Docker
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key Youtube-downloader-local
```

### Docker Hub Operations

```bash
# Login to Docker Hub
docker login

# Build and tag image
docker build -t jaypokharna/Youtube-downloader:latest .

# Push to Docker Hub
docker push jaypokharna/Youtube-downloader:latest

# Tag with specific version
docker tag jaypokharna/Youtube-downloader:latest jaypokharna/Youtube-downloader:v1.0.0
docker push jaypokharna/Youtube-downloader:v1.0.0

# Pull from Docker Hub
docker pull jaypokharna/Youtube-downloader:latest

# View local images
docker images | grep Youtube
```

### Server Operations

```bash
# Pull latest image
docker pull jaypokharna/Youtube-downloader:latest

# Start/restart container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Execute command in container
docker exec -it Youtube-downloader sh

# Remove old images
docker image prune -a
```

---

## 🏷️ Version Management

### Using Timestamps (Automatic)

The `build-and-push.sh` script automatically tags each build with a timestamp:

```bash
./build-and-push.sh
# Creates: jaypokharna/Youtube-downloader:latest
# And: jaypokharna/Youtube-downloader:20241201-143022
```

### Using Semantic Versioning (Manual)

For production releases, use semantic versioning:

```bash
# Build and tag with version
docker build -t jaypokharna/Youtube-downloader:v1.0.0 .
docker tag jaypokharna/Youtube-downloader:v1.0.0 jaypokharna/Youtube-downloader:latest

# Push both tags
docker push jaypokharna/Youtube-downloader:v1.0.0
docker push jaypokharna/Youtube-downloader:latest
```

Deploy specific version on server:
```bash
# Edit docker-compose.yml
image: jaypokharna/Youtube-downloader:v1.0.0  # Instead of :latest
```

### Rollback to Previous Version

If something breaks, rollback:

```bash
# On server
cd /opt/Youtube-downloader

# Check available versions on Docker Hub
docker pull jaypokharna/Youtube-downloader:20241201-120000

# Edit docker-compose.yml to use older version
nano docker-compose.yml
# Change: image: jaypokharna/Youtube-downloader:20241201-120000

# Restart
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Build Fails

```bash
# Check Docker is running
docker info

# Check Dockerfile syntax
docker build --no-cache -t test .

# Clean Docker cache
docker system prune -a
```

### Push Fails (Authentication)

```bash
# Re-login to Docker Hub
docker logout
docker login
# Enter username: jaypokharna
# Enter password: [your Docker Hub password or access token]
```

### Pull Fails on Server

```bash
# Check internet connectivity
ping hub.docker.com

# Check Docker Hub status
curl https://status.docker.com/

# Try manual pull
docker pull jaypokharna/Youtube-downloader:latest
```

### Image Not Updating

```bash
# Force pull latest
docker pull jaypokharna/Youtube-downloader:latest --no-cache

# Remove old container and image
docker-compose down
docker rmi jaypokharna/Youtube-downloader:latest
docker pull jaypokharna/Youtube-downloader:latest
docker-compose up -d
```

---

## 💡 Best Practices

1. **Always test locally first**
   ```bash
   npm run dev  # Test changes locally
   ```

2. **Build and push during low-traffic hours**
   - Updates require a brief restart (~5 seconds)

3. **Use semantic versioning for major releases**
   - `v1.0.0` for stable releases
   - `latest` for development/continuous deployment

4. **Keep a changelog**
   - Document what changed in each version

5. **Test on one server before updating all**
   - Deploy to staging/test server first
   - Verify everything works
   - Then update production servers

6. **Backup before major updates**
   ```bash
   # Backup current image
   docker tag jaypokharna/Youtube-downloader:latest jaypokharna/Youtube-downloader:backup-$(date +%Y%m%d)
   docker push jaypokharna/Youtube-downloader:backup-$(date +%Y%m%d)
   ```

---

## 🎯 Summary

**To update your app everywhere:**

1. **Make changes locally** → Edit code
2. **Build and push** → `./build-and-push.sh`
3. **Update servers** → SSH in, `docker pull` + `docker-compose up -d`

**That's it!** Simple, fast, and works on any cloud provider.
