import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { cookiesExist, isYouTubeCookieError, COOKIES_PATH } from '@/lib/cookieManager';

// Store temp file info with timestamps for cleanup
const tempFiles = new Map<string, { filepath: string; timestamp: number }>();

// Cleanup old temp files (> 5 minutes)
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  tempFiles.forEach((value, key) => {
    if (now - value.timestamp > fiveMinutes) {
      try {
        if (fs.existsSync(value.filepath)) {
          fs.unlinkSync(value.filepath);
          console.log(`Cleaned up temp file: ${value.filepath}`);
        }
        tempFiles.delete(key);
      } catch (err) {
        console.error(`Failed to cleanup temp file: ${value.filepath}`, err);
      }
    }
  });
}, 60 * 1000); // Check every minute

export async function POST(request: NextRequest) {
  const { url, format_id } = await request.json();

  if (!url || !format_id) {
    return new Response(
      `data: ${JSON.stringify({ status: 'error', message: 'URL and format_id are required' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const safeEnqueue = (data: Uint8Array) => {
        if (!isClosed) {
          try {
            controller.enqueue(data);
          } catch (err) {
            console.error('Error enqueueing data:', err);
            isClosed = true;
          }
        }
      };

      const safeClose = () => {
        if (!isClosed) {
          try {
            controller.close();
            isClosed = true;
          } catch (err) {
            console.error('Error closing controller:', err);
          }
        }
      };

      try {
        // Create temp directory and file
        const tempDir = path.join(os.tmpdir(), 'zenith-downloads');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileId = uuidv4();
        let formatSpec: string;
        let extension: string;
        let outputTemplate: string;

        if (format_id === 'video') {
          // Best video + best audio, prefer 60fps, merge to MP4
          formatSpec = 'bestvideo[fps>=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
          extension = 'mp4';
          outputTemplate = path.join(tempDir, `${fileId}`);
        } else if (format_id === 'audio') {
          // Best audio, extract to MP3
          formatSpec = 'bestaudio/best';
          extension = 'mp3';
          outputTemplate = path.join(tempDir, `${fileId}`);
        } else {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Invalid format_id' })}\n\n`));
          safeClose();
          return;
        }

        safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Starting download...' })}\n\n`));

        const haveCookies = cookiesExist();

        const args = [
          '-f', formatSpec,
          '-o', outputTemplate,
          '--newline',
          '--no-colors',
        ];

        // Add cookies if available
        if (haveCookies) {
          args.unshift('--no-check-certificates', '--cookies', COOKIES_PATH);
        }

        // For video, merge to MP4
        if (format_id === 'video') {
          args.push('--merge-output-format', 'mp4');
        } else {
          // For audio, extract to MP3
          args.push('-x', '--audio-format', 'mp3');
        }

        args.push(url);

        console.log('[yt-dlp] command=yt-dlp', args.join(' '));

        const process = spawn('yt-dlp', args);

        let stderrBuffer = '';

        process.stdout.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (!line) return;

          // Parse progress
          if (line.includes('[download]') && line.includes('%')) {
            const pctMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
            const speedMatch = line.match(/(\d+(?:\.\d+)?\s*[KMG]iB\/s)/);
            const etaMatch = line.match(/ETA\s+(\d+:\d+(?::\d+)?)/);

            if (pctMatch) {
              const percentage = parseFloat(pctMatch[1]);
              const speed = speedMatch ? speedMatch[1] : '-- MiB/s';
              const eta = etaMatch ? etaMatch[1] : '--:--';

              safeEnqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'progress',
                percentage,
                speed,
                eta
              })}\n\n`));
            }
          }
          // Merge message
          else if (line.includes('[Merger]') || line.includes('Merging')) {
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Merging video and audio to MP4...' })}\n\n`));
          }
          // Post-processing (audio conversion)
          else if (line.includes('[ExtractAudio]') || line.includes('Extracting audio')) {
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Extracting audio to MP3...' })}\n\n`));
          }
          // Destination
          else if (line.includes('[download] Destination:')) {
            const dest = line.split('Destination:')[1]?.trim() || '';
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: `Saving to: ${path.basename(dest)}` })}\n\n`));
          }
          // Already downloaded
          else if (line.includes('has already been downloaded')) {
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'File already exists, skipping...' })}\n\n`));
          }
        });

        process.stderr.on('data', (data: Buffer) => {
          const errorText = data.toString();
          stderrBuffer += errorText;
          console.error('[yt-dlp] stderr:', errorText);
        });

        process.on('close', (code) => {
          console.log(`[yt-dlp] exit=${code}`);

          // Check for cookie-related errors on failure
          if (code !== 0) {
            if (isYouTubeCookieError(stderrBuffer)) {
              let message = 'YouTube requires authentication to download this video.';
              let errorCode = 'youtube_restriction';

              if (!haveCookies) {
                message = 'YouTube requires authentication. Please contact admin to upload cookies.';
                errorCode = 'missing_cookies';
              } else {
                message = 'YouTube authentication failed. Cookies may be expired. Please contact admin.';
                errorCode = 'invalid_cookies';
              }

              safeEnqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'error',
                code: errorCode,
                message
              })}\n\n`));
              safeClose();
              return;
            }
          }

          if (code === 0) {
            // Find the actual downloaded file (yt-dlp may change the extension)
            const possibleFiles = [
              path.join(tempDir, `${fileId}.${extension}`),
              path.join(tempDir, `${fileId}.mp4`),
              path.join(tempDir, `${fileId}.webm`),
              path.join(tempDir, `${fileId}.mkv`),
              path.join(tempDir, `${fileId}.mp3`),
              path.join(tempDir, `${fileId}.m4a`),
            ];

            let downloadedFile = possibleFiles.find(f => fs.existsSync(f));

            if (downloadedFile) {
              // Store temp file info for cleanup
              tempFiles.set(fileId, {
                filepath: downloadedFile,
                timestamp: Date.now()
              });

              safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Download completed successfully!' })}\n\n`));
              safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'complete', fileId })}\n\n`));
            } else {
              safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Download completed but file not found' })}\n\n`));
            }
          } else {
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `Download failed with code ${code}` })}\n\n`));
          }
          safeClose();
        });

        process.on('error', (err) => {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`));
          safeClose();
        });

      } catch (error: any) {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`));
        safeClose();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
