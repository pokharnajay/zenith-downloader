# Zenith Downloader

A high-performance video downloader built with Next.js. Features a beautiful dark UI, AI-powered filename suggestions, and real-time download progress.

## Features

- Download videos in best quality (MP4) or audio-only (MP3)
- AI-powered smart filename generation (using Google Gemini)
- Real-time download progress with speed and ETA
- Beautiful dark mode UI with smooth animations
- Choose custom download location
- Supports 60fps video when available

---

## Quick Start - Production Deployment

### Deploy with Docker (DigitalOcean / Google Cloud / Any VPS)

Deploy this app using Docker on any cloud provider:

```bash
# 1. SSH into your server
ssh root@YOUR_SERVER_IP

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 3. Clone the repo
git clone https://github.com/YOUR_USERNAME/zenith-downloader.git
cd zenith-downloader

# 4. Create .env file
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY

# 5. Start the app
docker-compose up -d --build

# 6. Access at http://YOUR_SERVER_IP
```

**📖 For complete deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## Run Locally (Development)

### Prerequisites

- **Node.js** (v18 or higher)
- **yt-dlp** installed and available in PATH
  ```bash
  # macOS
  brew install yt-dlp

  # Ubuntu/Debian
  apt install yt-dlp

  # or using pip
  pip install yt-dlp
  ```

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set your Gemini API key for AI filename suggestions:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI filename generation. Get it from [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `NODE_ENV` | Auto-set | Set to `production` in Docker |
| `PORT` | Auto-set | Server port (default: 3000) |

---

## Tech Stack

- **Next.js 14** (App Router) - React framework with API routes
- **Tailwind CSS** - Styling
- **Framer Motion** - Smooth animations
- **yt-dlp** - Video downloading engine
- **Google Gemini** - AI filename generation
- **Docker** - Production deployment

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── py-analyze/route.ts  # Video analysis endpoint
│   │   ├── py-download/route.ts # Download with SSE streaming
│   │   └── rename/route.ts      # AI filename generation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Main UI
├── components/
│   └── QualitySelector.tsx
├── lib/
│   ├── api.ts                   # Frontend API client
│   └── types.ts                 # TypeScript types
├── Dockerfile                   # Production Docker image
├── docker-compose.yml           # Docker Compose config
└── DEPLOYMENT.md                # Complete deployment guide
```

---

## How It Works

1. **Analyze**: Paste a video URL, the app uses `yt-dlp` to fetch metadata (title, thumbnail, duration)
2. **Choose Format**: Select Video (MP4) or Audio (MP3)
3. **Choose Location**: Specify where to save the file
4. **Download**: Real-time progress bar shows download speed and ETA
5. **Complete**: File is saved to your chosen location

---

## Deployment Options

### Docker Deployment (Recommended)
Works on any cloud provider with Docker support:

- **DigitalOcean Droplet** - ~$6/month for basic droplet
- **Google Cloud Compute Engine** - Similar pricing, great performance
- **AWS EC2** - Wide range of instance options
- **Any VPS with Docker** - The Dockerfile and docker-compose.yml work on any Linux server

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

**Quick Deploy:**
```bash
docker-compose up -d --build
```

---

## API Endpoints

### `POST /api/py-analyze`
Analyzes a video URL and returns metadata.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=..."
}
```

**Response:**
```json
{
  "metadata": {
    "title": "Video Title",
    "thumbnail": "https://...",
    "duration": "5:30"
  },
  "qualities": [
    { "id": "video", "resolution": "Video", ... },
    { "id": "audio", "resolution": "Audio", ... }
  ]
}
```

### `POST /api/py-download`
Downloads the video with real-time progress (Server-Sent Events).

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=...",
  "format_id": "video",
  "download_path": "/path/to/save"
}
```

**Response:** SSE stream with progress updates

---

## License

MIT

---

## Troubleshooting

### Downloads not working?
- Ensure `yt-dlp` is installed: `yt-dlp --version`
- Update yt-dlp: `pip install --upgrade yt-dlp`

### AI rename not working?
- Check if `GEMINI_API_KEY` is set in your `.env` file
- Verify the API key is valid

### Docker container not starting?
- Check logs: `docker-compose logs -f`
- Ensure port 80 is not in use: `sudo lsof -i :80`

For more troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).
