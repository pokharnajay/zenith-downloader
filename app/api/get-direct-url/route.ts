import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { cookiesExist, COOKIES_PATH } from '@/lib/cookieManager';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url, format_id } = await request.json();

    if (!url || !format_id) {
      return NextResponse.json(
        { error: 'URL and format_id are required' },
        { status: 400 }
      );
    }

    const haveCookies = cookiesExist();

    // Build format specifier
    let formatSpec: string;
    if (format_id === 'video') {
      formatSpec = 'bestvideo[fps>=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
    } else if (format_id === 'audio') {
      formatSpec = 'bestaudio/best';
    } else {
      return NextResponse.json(
        { error: 'Invalid format_id' },
        { status: 400 }
      );
    }

    // Get direct download URL from yt-dlp
    const cookieFlag = haveCookies ? `--cookies ${COOKIES_PATH}` : '';
    const command = `yt-dlp ${cookieFlag} --get-url -f "${formatSpec}" "${url}"`;

    console.log('[get-direct-url] Getting download URL...');

    let stdout: string;
    try {
      const result = await execAsync(command, { timeout: 30000 });
      stdout = result.stdout;
    } catch (error: any) {
      console.error('[get-direct-url] Error:', error);
      return NextResponse.json(
        { error: 'Failed to get download URL' },
        { status: 500 }
      );
    }

    // Parse URLs (can be multiple if video+audio)
    const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No download URL found' },
        { status: 404 }
      );
    }

    console.log(`[get-direct-url] Found ${urls.length} URL(s)`);

    // For video format with separate streams, we need to merge them
    // For now, return the first URL (this will be direct video or audio)
    return NextResponse.json({
      success: true,
      url: urls[0],
      needsMerge: urls.length > 1,
      urls: urls,
    });

  } catch (error: any) {
    console.error('[get-direct-url] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
