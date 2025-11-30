import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VideoFormat {
  id: string;
  resolution: string;
  fps: number;
  ext: string;
  size: string;
  note?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "Unknown";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function parseFormats(output: string): { qualities: VideoFormat[], audioFormats: string[] } {
  const qualities: VideoFormat[] = [];
  const audioFormats: string[] = [];

  const lines = output.split('\n');
  for (const line of lines) {
    // Match video formats
    const videoMatch = line.match(/^(\d+)\s+(\w+)\s+(\d+x\d+|\d+p)\s+/);
    if (videoMatch) {
      const fmtId = videoMatch[1];
      const ext = videoMatch[2];
      const res = videoMatch[3];

      // Extract fps
      const fpsMatch = line.match(/(\d+)\s*fps/i);
      const fps = fpsMatch ? parseInt(fpsMatch[1]) : 30;

      // Extract size
      const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*(MiB|GiB|KiB)/i);
      const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : "Unknown";

      // Normalize resolution
      let resolution = res;
      if (res.includes('x')) {
        const height = res.split('x')[1];
        resolution = `${height}p`;
      }

      // Check for video only
      const note = line.toLowerCase().includes('video only') ? 'video only' : undefined;

      qualities.push({ id: fmtId, resolution, fps, ext, size, note });
    }
    // Match audio formats
    else if (line.match(/^(\d+)\s+(m4a|mp3|webm|opus)/)) {
      const parts = line.split(/\s+/);
      audioFormats.push(parts[0]);
    }
  }

  // Sort by resolution (highest first)
  qualities.sort((a, b) => {
    const aRes = parseInt(a.resolution.replace('p', '')) || 0;
    const bRes = parseInt(b.resolution.replace('p', '')) || 0;
    return bRes - aRes;
  });

  return { qualities, audioFormats };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get video metadata
    const { stdout: jsonOutput } = await execAsync(`yt-dlp --dump-json --no-download "${url}"`);
    const info = JSON.parse(jsonOutput);

    // Get formats
    const { stdout: formatsOutput } = await execAsync(`yt-dlp -F "${url}"`);
    const { qualities } = parseFormats(formatsOutput);

    const metadata = {
      title: info.title || 'Unknown Title',
      thumbnail: info.thumbnail || '',
      duration: formatDuration(info.duration || 0)
    };

    return NextResponse.json({ metadata, qualities });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
