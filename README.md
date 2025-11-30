# Zenith Downloader

A high-performance video downloader built with Next.js. Features a beautiful dark UI, AI-powered filename suggestions, and real-time download progress.

## Features

- Download videos in various qualities
- AI-powered smart filename generation (using Google Gemini)
- Real-time download progress with speed and ETA
- Beautiful dark mode UI with animations
- Easy to deploy on Vercel

## Prerequisites

- **Node.js** (v18 or higher)
- **yt-dlp** installed and available in PATH
  ```bash
  # macOS
  brew install yt-dlp

  # or using pip
  pip install yt-dlp
  ```

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set your Gemini API key for AI filename suggestions:
   Edit `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add `GEMINI_API_KEY` as an environment variable (optional)
4. Deploy!

**Note:** For Vercel deployment, you'll need to ensure `yt-dlp` is available. Consider using a custom runtime or serverless function that includes the binary.

## Tech Stack

- **Next.js 14** - React framework with API routes
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **yt-dlp** - Video downloading
- **Google Gemini** - AI filename generation

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   # Video analysis endpoint
│   │   ├── download/route.ts  # Download with SSE streaming
│   │   └── rename/route.ts    # AI filename generation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Main UI
├── components/
│   ├── QualitySelector.tsx
│   └── TerminalOutput.tsx
├── lib/
│   ├── api.ts                 # Frontend API client
│   └── types.ts               # TypeScript types
└── ...config files
```
