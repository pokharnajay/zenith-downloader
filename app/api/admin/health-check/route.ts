import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword } from '@/lib/cookieManagerV2';
import { checkAllCookiesHealth } from '@/lib/healthChecker';

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

    // Run health check (this may take a while)
    const result = await checkAllCookiesHealth();

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error: any) {
    console.error('[API] Error running health check:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run health check' },
      { status: 500 }
    );
  }
}
