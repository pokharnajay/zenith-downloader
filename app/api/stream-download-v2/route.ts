import { NextRequest } from 'next/server';
import { downloadWithFallback, quickCookieCheck } from '@/lib/downloadFallback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const format_id = searchParams.get('format_id');
  const filename = searchParams.get('filename') || 'download';

  if (!url || !format_id) {
    return new Response('URL and format_id are required', { status: 400 });
  }

  // Quick check if any cookies are available
  const cookieCheck = quickCookieCheck();

  if (!cookieCheck.available) {
    return new Response(
      JSON.stringify({
        error: 'Server maintenance in progress. Please try again in a few minutes.',
        code: 'maintenance',
        message: cookieCheck.message,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Build format specifier - OPTIMIZED FOR SPEED
  let formatSpec: string;
  let extension: string;
  let contentType: string;

  if (format_id === 'video') {
    formatSpec = 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best';
    extension = 'mp4';
    contentType = 'video/mp4';
  } else if (format_id === 'audio') {
    // More flexible audio format spec with fallbacks
    formatSpec = 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio';
    extension = 'm4a';
    contentType = 'audio/mp4';
  } else {
    return new Response('Invalid format_id', { status: 400 });
  }

  const downloadFilename = `${filename.replace(/[^a-zA-Z0-9\s]/g, '_')}.${extension}`;

  console.log(`[stream-download-v2] Starting download with fallback for: ${url}`);
  console.log(`[stream-download-v2] Format: ${format_id}, Filename: ${downloadFilename}`);

  // Build yt-dlp arguments - OPTIMIZED BASED ON FORMAT
  const args = [
    '-f',
    formatSpec,
    '-o',
    '-', // Output to stdout
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    '--no-part',
    '--no-check-certificates',
    '--no-call-home', // Skip update checks
    '--extractor-retries',
    '1', // Fail fast
    '--fragment-retries',
    '5', // Retry fragments
    '--skip-unavailable-fragments',
  ];

  // Video-specific optimizations
  if (format_id === 'video') {
    args.push(
      '--buffer-size', '4K', // Smaller buffer = faster start
      '--http-chunk-size', '5M', // Smaller chunks = more parallel connections
      '--concurrent-fragments', '16', // Maximum parallelism for video
      '--merge-output-format', 'mp4'
    );
  } else {
    // Audio-specific optimizations (fewer concurrent fragments for stability)
    args.push(
      '--buffer-size', '4K',
      '--http-chunk-size', '2M', // Smaller chunks for audio
      '--concurrent-fragments', '8' // Less parallelism for audio to avoid issues
    );
  }

  args.push(url);

  // Use fallback system to get yt-dlp process with working cookies
  try {
    const fallbackResult = await downloadWithFallback(url, args);

    if (!fallbackResult.success || !fallbackResult.process) {
      console.error('[stream-download-v2] Fallback failed:', fallbackResult.error);

      return new Response(
        JSON.stringify({
          error: fallbackResult.error || 'Download failed after trying all methods',
          code: 'download_failed',
          attempts: fallbackResult.attemptsCount,
          fallbackMethod: fallbackResult.fallbackMethod,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const ytdlp = fallbackResult.process;
    let hasStarted = false;
    let errorBuffer = '';

    console.log(`[stream-download-v2] Download started with: ${fallbackResult.fallbackMethod} (attempts: ${fallbackResult.attemptsCount})`);

    // Capture stderr for error messages
    ytdlp.stderr?.on('data', (data: Buffer) => {
      errorBuffer += data.toString();
    });

    // Create a readable stream from yt-dlp stdout
    const stream = new ReadableStream({
      start(controller) {
        ytdlp.stdout?.on('data', (chunk: Buffer) => {
          if (!hasStarted) {
            hasStarted = true;
            console.log('[stream-download-v2] Stream started, sending data...');
          }
          controller.enqueue(new Uint8Array(chunk));
        });

        ytdlp.stdout?.on('end', () => {
          controller.close();
          console.log('[stream-download-v2] Stream completed');
        });

        ytdlp.on('error', (error) => {
          console.error('[stream-download-v2] Process error:', error);
          controller.error(error);
        });

        ytdlp.on('close', (code) => {
          if (code !== 0 && !hasStarted) {
            console.error(`[stream-download-v2] yt-dlp exited with code ${code}`);
            console.error(`[stream-download-v2] Error: ${errorBuffer}`);
            controller.error(new Error(`Download failed: ${errorBuffer || 'Unknown error'}`));
          }
        });
      },
      cancel() {
        console.log('[stream-download-v2] Stream cancelled by client');
        ytdlp.kill();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Fallback-Method': fallbackResult.fallbackMethod || 'unknown',
        'X-Attempts-Count': String(fallbackResult.attemptsCount || 0),
      },
    });
  } catch (error: any) {
    console.error('[stream-download-v2] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unexpected error occurred',
        code: 'internal_error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
