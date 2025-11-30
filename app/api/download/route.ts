import { NextRequest } from 'next/server';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

function expandPath(inputPath: string): string {
  let expanded = inputPath;
  if (expanded.startsWith('~')) {
    expanded = path.join(os.homedir(), expanded.slice(1));
  }
  return path.resolve(expanded);
}

function parseFormatsForAudio(output: string): string[] {
  const audioFormats: string[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.match(/^(\d+)\s+(m4a|mp3|webm|opus)/)) {
      const parts = line.split(/\s+/);
      audioFormats.push(parts[0]);
    }
  }
  return audioFormats;
}

export async function POST(request: NextRequest) {
  const { url, format_id, filename, download_path } = await request.json();

  if (!url || !format_id) {
    return new Response(
      `data: ${JSON.stringify({ status: 'error', message: 'URL and format_id are required' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const downloadDir = expandPath(download_path || '~/Downloads');

  // Ensure directory exists
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // Sanitize filename
  const safeFilename = (filename || 'video').replace(/[<>:"/\\|?*]/g, '_');
  const outputPath = path.join(downloadDir, `${safeFilename}.%(ext)s`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: `Downloading to: ${downloadDir}` })}\n\n`));

        // Get audio formats for merging
        const { stdout: formatsOutput } = await execAsync(`yt-dlp -F "${url}"`);
        const audioFormats = parseFormatsForAudio(formatsOutput);

        let formatSpec = format_id;
        if (audioFormats.length > 0) {
          const bestAudio = audioFormats.reduce((a, b) => parseInt(a) > parseInt(b) ? a : b);
          formatSpec = `${format_id}+${bestAudio}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: `Merging video (${format_id}) with audio (${bestAudio})` })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Starting download...' })}\n\n`));

        const process = spawn('yt-dlp', [
          '-f', formatSpec,
          '-o', outputPath,
          '--newline',
          '--no-colors',
          url
        ]);

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

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'progress', percentage, speed, eta })}\n\n`));
            }
          }
          // Merge message
          else if (line.includes('[Merger]') || line.includes('Merging')) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'log', message: 'Merging video and audio...' })}\n\n`));
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
