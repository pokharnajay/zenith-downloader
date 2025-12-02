import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, getAllCookies, COOKIES_DIR } from '@/lib/cookieManagerV2';
import { testCookie } from '@/lib/healthChecker';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Validate admin password
    const authHeader = request.headers.get('authorization');
    const password = authHeader?.replace('Bearer ', '') || '';

    if (!validateAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid admin password.' },
        { status: 401 }
      );
    }

    // Get cookie ID from request body
    const body = await request.json();
    const { cookieId } = body;

    if (!cookieId) {
      return NextResponse.json(
        { error: 'Cookie ID is required' },
        { status: 400 }
      );
    }

    // Find the cookie
    const cookies = getAllCookies();
    const cookie = cookies.find(c => c.id === cookieId);

    if (!cookie) {
      return NextResponse.json(
        { error: 'Cookie not found' },
        { status: 404 }
      );
    }

    // Test the cookie
    const cookiePath = path.join(COOKIES_DIR, cookie.filename);
    const result = await testCookie(cookiePath);

    return NextResponse.json({
      success: true,
      cookieId,
      status: result.status,
      error: result.error || null,
    });

  } catch (error: any) {
    console.error('[API] Error testing cookie:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test cookie' },
      { status: 500 }
    );
  }
}
