import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

export async function POST(request: NextRequest) {
  const { url, format_id, download_path } = await request.json();

  if (!url || !format_id || !download_path) {
    return new Response(
      `data: ${JSON.stringify({ status: 'error', message: 'URL, format_id, and download_path are required' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let formatSpec: string;
        let outputTemplate: string;

        if (format_id === 'video') {
          // Best video + best audio, prefer 60fps, merge to MP4
          formatSpec = 'bestvideo[fps>=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
          outputTemplate = path.join(download_path, '%(title)s.%(ext)s');
        } else if (format_id === 'audio') {
          // Best audio, extract to MP3
          formatSpec = 'bestaudio/best';
          outputTemplate = path.join(download_path, '%(title)s.%(ext)s');
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Invalid format_id' })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Starting download...' })}\n\n`));

        const args = [
          '-f', formatSpec,
          '-o', outputTemplate,
          '--newline',
          '--no-colors',
        ];

        // For video, merge to MP4
        if (format_id === 'video') {
          args.push('--merge-output-format', 'mp4');
        } else {
          // For audio, extract to MP3
          args.push('-x', '--audio-format', 'mp3');
        }

        args.push(url);

        const process = spawn('yt-dlp', args);

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

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'progress',
                percentage,
                speed,
                eta
              })}\n\n`));
            }
          }
          // Merge message
          else if (line.includes('[Merger]') || line.includes('Merging')) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Merging video and audio to MP4...' })}\n\n`));
          }
          // Post-processing (audio conversion)
          else if (line.includes('[ExtractAudio]') || line.includes('Extracting audio')) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Extracting audio to MP3...' })}\n\n`));
          }
          // Destination
          else if (line.includes('[download] Destination:')) {
            const dest = line.split('Destination:')[1]?.trim() || '';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: `Saving to: ${path.basename(dest)}` })}\n\n`));
          }
          // Already downloaded
          else if (line.includes('has already been downloaded')) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'File already exists, skipping...' })}\n\n`));
          }
        });

        process.stderr.on('data', (data: Buffer) => {
          console.error('yt-dlp stderr:', data.toString());
        });

        process.on('close', (code) => {
          if (code === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Download completed successfully!' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'complete' })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `Download failed with code ${code}` })}\n\n`));
          }
          controller.close();
        });

        process.on('error', (err) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`));
          controller.close();
        });

      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`));
        controller.close();
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
