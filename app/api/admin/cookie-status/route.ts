import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, getCookieInfo, COOKIES_PATH } from '@/lib/cookieManager';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const password = authHeader?.replace('Bearer ', '') || '';

    if (!validateAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin password' },
        { status: 401 }
      );
    }

    // Get basic cookie info
    const cookieInfo = getCookieInfo();

    // If cookies don't exist, return early
    if (!cookieInfo.exists) {
      return NextResponse.json({
        exists: false,
        valid: false,
        age: null,
        lastModified: null,
        size: null,
        tested: false,
        message: 'No cookies file found',
      });
    }

    // Test cookies with yt-dlp (optional - can be slow)
    const testUrl = request.nextUrl.searchParams.get('test');
    let isValid = null;
    let testMessage = 'Not tested (use ?test=true to validate)';

    if (testUrl === 'true') {
      try {
        // Test with a simple YouTube video (Rick Roll - always available)
        const command = `yt-dlp --cookies ${COOKIES_PATH} --dump-json --no-download --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>&1 | head -n 20`;
        const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

        // Check for cookie errors
        const output = stdout + stderr;
        if (output.includes('cookies are no longer valid') ||
            output.includes('Sign in to confirm you\'re not a bot') ||
            output.includes('cookies have been rotated')) {
          isValid = false;
          testMessage = 'Cookies are invalid or expired';
        } else if (output.includes('"id"') || output.includes('"title"')) {
          isValid = true;
          testMessage = 'Cookies are working correctly';
        } else {
          isValid = false;
          testMessage = 'Unable to verify cookies';
        }
      } catch (error: any) {
        isValid = false;
        testMessage = `Test failed: ${error.message}`;
      }
    }

    return NextResponse.json({
      exists: cookieInfo.exists,
      valid: isValid,
      age: cookieInfo.age,
      lastModified: cookieInfo.lastModified,
      size: cookieInfo.size,
      tested: testUrl === 'true',
      message: testMessage,
      warning: cookieInfo.age && cookieInfo.age > 30 ? 'Cookies are older than 30 days and may be expired' : null,
    });

  } catch (error: any) {
    console.error('[Admin] Cookie status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check cookie status' },
      { status: 500 }
    );
  }
}
