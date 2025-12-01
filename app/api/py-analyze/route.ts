import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check if cookies.txt exists
    if (!fs.existsSync('/app/cookies.txt')) {
      console.error('[yt-dlp] cookies.txt missing at /app/cookies.txt');
      return NextResponse.json(
        {
          status: 'error',
          code: 'missing_cookies',
          message: 'YouTube access temporarily blocked — internal authentication update required'
        },
        { status: 503 }
      );
    }

    // Get video metadata using yt-dlp
    const command = `yt-dlp --cookies /app/cookies.txt --no-check-certificates --dump-json --no-download "${url}"`;
    console.log('[yt-dlp] command=', command);

    let stdout: string;
    let stderr: string;
    let exitCode: number = 0;

    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr || '';
    } catch (error: any) {
      stdout = error.stdout || '';
      stderr = error.stderr || '';
      exitCode = error.code || 1;

      console.log(`[yt-dlp] exit=${exitCode}`);

      // Check for specific YouTube restrictions
      if (stderr.includes('Sign in to confirm you\'re not a bot') ||
          stderr.includes('This video is age restricted')) {
        return NextResponse.json(
          {
            status: 'error',
            code: 'youtube_restriction',
            message: 'This video cannot be processed because YouTube requires authentication'
          },
          { status: 403 }
        );
      }

      // Re-throw for generic error handling
      throw error;
    }

    console.log(`[yt-dlp] exit=${exitCode}`);

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
