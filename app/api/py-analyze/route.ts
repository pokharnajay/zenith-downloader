import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get video metadata using yt-dlp
    const { stdout } = await execAsync(`yt-dlp --dump-json --no-download "${url}"`);
    const info = JSON.parse(stdout);

    // Format duration
    const durationSecs = info.duration || 0;
    let duration = 'Unknown';
    if (durationSecs) {
      const hours = Math.floor(durationSecs / 3600);
      const minutes = Math.floor((durationSecs % 3600) / 60);
      const secs = Math.floor(durationSecs % 60);
      if (hours > 0) {
        duration = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        duration = `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    }

    const metadata = {
      title: info.title || 'Unknown Title',
      thumbnail: info.thumbnail || '',
      duration
    };

    // Simple options: Video or Audio
    const qualities = [
      {
        id: 'video',
        resolution: 'Video',
        fps: 0,
        ext: 'mp4',
        size: 'Best quality',
        note: 'Video + Audio'
      },
      {
        id: 'audio',
        resolution: 'Audio',
        fps: 0,
        ext: 'mp3',
        size: 'Best quality',
        note: 'Audio only'
      }
    ];

    return NextResponse.json({
      metadata,
      qualities
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
