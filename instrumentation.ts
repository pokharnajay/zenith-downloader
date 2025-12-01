// Next.js instrumentation for server startup hooks
// This file runs once when the server starts

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import fs dynamically to avoid bundling issues
    const fs = await import('fs');
    const cookiesPath = '/app/cookies.txt';

    if (fs.existsSync(cookiesPath)) {
      console.log('[Startup] ✓ cookies.txt found at /app/cookies.txt');
    } else {
      console.warn('[Startup] ⚠ WARNING: cookies.txt missing at /app/cookies.txt');
      console.warn('[Startup] ⚠ YouTube video metadata and downloads will likely fail');
      console.warn('[Startup] ⚠ Please mount cookies.txt via Docker volume or provide it at /app/cookies.txt');
    }
  }
}
