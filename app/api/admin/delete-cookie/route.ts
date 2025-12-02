import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, deleteCookie } from '@/lib/cookieManagerV2';

export async function DELETE(request: NextRequest) {
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

    // Delete the cookie
    const result = deleteCookie(cookieId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete cookie' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cookie deleted successfully',
    });

  } catch (error: any) {
    console.error('[API] Error deleting cookie:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete cookie' },
      { status: 500 }
    );
  }
}
