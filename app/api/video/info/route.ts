import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { quickCookieCheck } from '@/lib/downloadFallback';
import { getCurrentCookie, TEMP_FRAGMENTS_DIR } from '@/lib/cookieManagerV2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Quick check if any cookies are available
  const cookieCheck = quickCookieCheck();

  if (!cookieCheck.available) {
    return NextResponse.json(
      {
        error: 'Server maintenance in progress',
        code: 'maintenance',
      },
      { status: 503 }
    );
  }

  try {
    // Get current cookie
    const current = getCurrentCookie();

    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--skip-download',
      '--paths',
      `temp:${TEMP_FRAGMENTS_DIR}`, // Store temp files in proper directory
    ];

    if (current.filepath) {
      args.push('--cookies', current.filepath);
    }

    args.push(url);

    console.log('[video-info] Fetching metadata for:', url);

    const result = await executeYtdlp(args, 15000); // 15 second timeout

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch video info' },
        { status: 400 }
      );
    }

    // Parse JSON output
    const videoData = JSON.parse(result.output);

    // Extract relevant metadata
    const metadata = {
      title: videoData.title || 'Unknown Title',
      duration: videoData.duration || 0,
      thumbnail: videoData.thumbnail || null,
      channel: videoData.uploader || videoData.channel || 'Unknown',
      viewCount: videoData.view_count || 0,
      uploadDate: videoData.upload_date || null,
    };

    console.log('[video-info] Metadata fetched:', metadata.title);

    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('[video-info] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video info' },
      { status: 500 }
    );
  }
}

/**
 * Execute yt-dlp command with timeout
 */
function executeYtdlp(
  args: string[],
  timeout: number
): Promise<{
  success: boolean;
  output: string;
  error: string;
}> {
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    let timedOut = false;

    const process = spawn('yt-dlp', args);

    const timer = setTimeout(() => {
      timedOut = true;
      process.kill();
      resolve({ success: false, output: '', error: 'Timeout after 15 seconds' });
    }, timeout);

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) return;

      if (code === 0 && output) {
        resolve({ success: true, output, error: '' });
      } else {
        resolve({
          success: false,
          output: '',
          error: errorOutput || output || `Process exited with code ${code}`,
        });
      }
    });

    process.on('error', (error) => {
      clearTimeout(timer);
      if (!timedOut) {
        resolve({ success: false, output: '', error: error.message });
      }
    });
  });
}
