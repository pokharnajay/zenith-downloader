# Deployment Guide - DigitalOcean Droplet

This guide will walk you through deploying **Zenith Downloader** on a DigitalOcean Droplet using Docker.

## Prerequisites

- A DigitalOcean Droplet running Ubuntu 22.04 LTS (or similar)
- SSH access to your droplet
- A domain name (optional, but recommended)
- Gemini API key (optional, for AI rename feature)

---

## Step 1: Initial Server Setup

### 1.1 SSH into your Droplet

```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 1.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
```

### 1.4 Install Docker Compose

```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 1.5 Install Git (if not already installed)

```bash
apt install git -y
```

---

## Step 2: Clone and Configure the Application

### 2.1 Clone the Repository

```bash
# Navigate to your desired directory
cd /opt

# Clone the repository
git clone https://github.com/YOUR_USERNAME/zenith-downloader.git
cd zenith-downloader
```

### 2.2 Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**Set your environment variables:**

```env
# Required: Get your API key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional - these are already set by Docker
# NODE_ENV=production
# PORT=3000
# HOSTNAME=0.0.0.0
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

---

## Step 3: Build and Run the Application

### 3.1 Build and Start the Container

```bash
docker-compose up -d --build
```

This command will:
- Build the Docker image (takes 2-5 minutes on first run)
- Start the container in detached mode
- Map port 80 on your server to the app

### 3.2 Verify the Container is Running

```bash
docker-compose ps
```

You should see output like:
```
NAME                 IMAGE                    STATUS         PORTS
zenith-downloader    zenith-downloader-web    Up 30 seconds  0.0.0.0:80->3000/tcp
```

### 3.3 Check Application Logs

```bash
docker-compose logs -f web
```

Press `Ctrl+C` to exit logs view.

---

## Step 4: Access Your Application

Open your browser and navigate to:

```
http://YOUR_SERVER_IP
```

You should see the Zenith Downloader interface!

---

## Maintenance Commands

### View Logs

```bash
# View all logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100

# View only web service logs
docker-compose logs -f web
```

### Restart the Application

```bash
docker-compose restart
```

### Stop the Application

```bash
docker-compose down
```

### Update After Code Changes

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Clear Everything and Start Fresh

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker rmi zenith-downloader-web

# Rebuild from scratch
docker-compose up -d --build
```

---

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs for errors
docker-compose logs web

# Common issues:
# - Missing .env file
# - Invalid environment variables
# - Port 80 already in use
```

### Port 80 Already in Use

If you have another service (like Apache or Nginx) running on port 80:

**Option 1:** Stop the conflicting service
```bash
systemctl stop apache2
# or
systemctl stop nginx
```

**Option 2:** Use a different port (edit docker-compose.yml)
```yaml
ports:
  - "8080:3000"  # Use port 8080 instead
```

Then access via `http://YOUR_SERVER_IP:8080`

### yt-dlp Not Working

If downloads fail:
```bash
# Enter the container
docker exec -it zenith-downloader sh

# Check if yt-dlp is installed
yt-dlp --version

# Update yt-dlp
apk add --no-cache yt-dlp

# Exit container
exit
```

### Out of Memory

If the build fails due to memory:
```bash
# Add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

---

## Production Best Practices

### 1. Set Up SSL/HTTPS (Recommended)

Use Cloudflare Tunnel or Let's Encrypt with Nginx reverse proxy.

**Quick Cloudflare Tunnel Setup:**
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create zenith

# Route traffic
cloudflared tunnel route dns zenith your-domain.com

# Run tunnel
cloudflared tunnel run zenith --url http://localhost:80
```

### 2. Set Up Auto-restart on Boot

Docker Compose already sets `restart: unless-stopped`, but ensure Docker itself starts on boot:

```bash
systemctl enable docker
```

### 3. Set Up Log Rotation

```bash
# Edit Docker daemon config
nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
systemctl restart docker
```

### 4. Monitor Resource Usage

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check container stats
docker stats
```

### 5. Regular Updates

```bash
# Update system packages monthly
apt update && apt upgrade -y

# Update application
cd /opt/zenith-downloader
git pull
docker-compose up -d --build
```

---

## Security Considerations

1. **Firewall Setup:**
```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (if using SSL)
ufw enable
```

2. **Disable Root Login:**
```bash
# Create a non-root user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Then disable root SSH in /etc/ssh/sshd_config
# Set: PermitRootLogin no
```

3. **Keep Dependencies Updated:**
```bash
# Update yt-dlp regularly (inside container)
docker exec -it zenith-downloader apk add --upgrade yt-dlp
```

---

## Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Check container status: `docker-compose ps`
4. Review system resources: `docker stats`

For application-specific issues, check the main README.md file.
