import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename') || 'download';

  if (!fileId) {
    return new Response('File ID is required', { status: 400 });
  }

  const tempDir = path.join(os.tmpdir(), 'zenith-downloads');

  // Try to find the file with various extensions
  const possibleFiles = [
    path.join(tempDir, `${fileId}.mp4`),
    path.join(tempDir, `${fileId}.webm`),
    path.join(tempDir, `${fileId}.mkv`),
    path.join(tempDir, `${fileId}.mp3`),
    path.join(tempDir, `${fileId}.m4a`),
  ];

  const filepath = possibleFiles.find(f => fs.existsSync(f));

  if (!filepath || !fs.existsSync(filepath)) {
    console.error(`[retrieve-file] File not found. Tried: ${possibleFiles.join(', ')}`);
    return new Response('File not found or expired', { status: 404 });
  }

  try {
    const stat = fs.statSync(filepath);
    const ext = path.extname(filepath);

    // Determine content type
    const contentTypeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    const downloadFilename = `${filename}${ext}`;

    console.log(`[retrieve-file] Streaming file: ${filepath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

    // Stream the file instead of loading it all into memory
    const readStream = fs.createReadStream(filepath);

    // Convert Node.js stream to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        readStream.on('data', (chunk: string | Buffer) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer));
        });

        readStream.on('end', () => {
          controller.close();
          console.log(`[retrieve-file] Completed streaming: ${filepath}`);
        });

        readStream.on('error', (error) => {
          console.error('[retrieve-file] Stream error:', error);
          controller.error(error);
        });
      },
      cancel() {
        readStream.destroy();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[retrieve-file] Error:', error);
    return new Response('Error retrieving file', { status: 500 });
  }
}
