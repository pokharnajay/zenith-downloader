import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { cookiesExist, COOKIES_PATH, isYouTubeCookieError } from '@/lib/cookieManager';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const format_id = searchParams.get('format_id');
  const filename = searchParams.get('filename') || 'download';

  if (!url || !format_id) {
    return new Response('URL and format_id are required', { status: 400 });
  }

  const haveCookies = cookiesExist();

  // Check for missing cookies with friendly message
  if (!haveCookies) {
    return new Response(
      JSON.stringify({
        error: 'Server maintenance in progress. Please try again in a few minutes.',
        code: 'maintenance'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Build format specifier - OPTIMIZED FOR SPEED
  let formatSpec: string;
  let extension: string;
  let contentType: string;

  if (format_id === 'video') {
    // Simplified format spec for faster processing - prefer single format over merging
    formatSpec = 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best';
    extension = 'mp4';
    contentType = 'video/mp4';
  } else if (format_id === 'audio') {
    // Direct audio format, no conversion needed
    formatSpec = 'bestaudio[ext=m4a]/bestaudio';
    extension = 'm4a';
    contentType = 'audio/mp4';
  } else {
    return new Response('Invalid format_id', { status: 400 });
  }

  const downloadFilename = `${filename.replace(/[^a-zA-Z0-9\s]/g, '_')}.${extension}`;

  console.log(`[stream-download] Starting stream for: ${url}`);
  console.log(`[stream-download] Format: ${format_id}, Filename: ${downloadFilename}`);

  // Build yt-dlp command to output to stdout - OPTIMIZED
  const args = [
    '-f', formatSpec,
    '-o', '-', // Output to stdout
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    '--no-part', // Don't use .part files
    '--buffer-size', '16K', // Smaller buffer for faster start
    '--http-chunk-size', '10M', // Download in chunks
    '--concurrent-fragments', '5', // Download multiple fragments at once
  ];

  if (haveCookies) {
    args.unshift('--no-check-certificates', '--cookies', COOKIES_PATH);
  }

  // For video, merge streams
  if (format_id === 'video') {
    args.push('--merge-output-format', 'mp4');
  }

  args.push(url);

  console.log('[stream-download] Command: yt-dlp', args.join(' '));

  const ytdlp = spawn('yt-dlp', args);

  let hasStarted = false;
  let errorBuffer = '';

  // Capture stderr for error messages
  ytdlp.stderr.on('data', (data: Buffer) => {
    errorBuffer += data.toString();
  });

  // Create a readable stream from yt-dlp stdout
  const stream = new ReadableStream({
    start(controller) {
      ytdlp.stdout.on('data', (chunk: Buffer) => {
        if (!hasStarted) {
          hasStarted = true;
          console.log('[stream-download] Stream started, sending data...');
        }
        controller.enqueue(new Uint8Array(chunk));
      });

      ytdlp.stdout.on('end', () => {
        controller.close();
        console.log('[stream-download] Stream completed');
      });

      ytdlp.on('error', (error) => {
        console.error('[stream-download] Process error:', error);
        controller.error(error);
      });

      ytdlp.on('close', (code) => {
        if (code !== 0 && !hasStarted) {
          console.error(`[stream-download] yt-dlp exited with code ${code}`);
          console.error(`[stream-download] Error: ${errorBuffer}`);
          controller.error(new Error(`Download failed: ${errorBuffer || 'Unknown error'}`));
        }
      });
    },
    cancel() {
      console.log('[stream-download] Stream cancelled by client');
      ytdlp.kill();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
