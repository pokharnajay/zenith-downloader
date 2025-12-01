import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { cookiesExist, isYouTubeCookieError, COOKIES_PATH } from '@/lib/cookieManager';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const haveCookies = cookiesExist();

    // Build command - use cookies if available
    const cookieFlag = haveCookies ? `--cookies ${COOKIES_PATH}` : '';
    const command = `yt-dlp ${cookieFlag} --no-check-certificates --dump-json --no-download "${url}"`;
    console.log('[yt-dlp] command=', command.replace(COOKIES_PATH, '[COOKIES]'));

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

      const errorOutput = stderr + stdout;

      // Check if this is a cookie-related error
      if (isYouTubeCookieError(errorOutput)) {
        if (!haveCookies) {
          return NextResponse.json(
            {
              status: 'error',
              code: 'missing_cookies',
              message: 'YouTube requires authentication. Please contact admin to upload cookies.'
            },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            {
              status: 'error',
              code: 'invalid_cookies',
              message: 'YouTube authentication failed. Cookies may be expired. Please contact admin.'
            },
            { status: 403 }
          );
        }
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
