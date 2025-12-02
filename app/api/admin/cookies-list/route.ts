import { NextRequest, NextResponse } from 'next/server';
import {
  validateAdminPassword,
  getAllCookies,
  getCookieStats,
  getCurrentCookie,
  loadCookieStatus,
} from '@/lib/cookieManagerV2';

export async function GET(request: NextRequest) {
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

    // Get all cookies
    const cookies = getAllCookies();
    const stats = getCookieStats();
    const current = getCurrentCookie();
    const statusData = loadCookieStatus();

    return NextResponse.json({
      cookies,
      stats,
      currentCookieId: current.metadata?.id || null,
      lastRotation: statusData.lastRotation,
      lastHealthCheck: statusData.lastHealthCheck,
      chromiumUsageCount: statusData.chromiumUsageCount,
      chromiumFallbackEnabled: statusData.chromiumFallbackEnabled,
    });

  } catch (error: any) {
    console.error('[API] Error fetching cookie list:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cookies' },
      { status: 500 }
    );
  }
}
