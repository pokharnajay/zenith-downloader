import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, saveCookies } from '@/lib/cookieManager';

export async function POST(request: NextRequest) {
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

    // Get the uploaded file content
    const formData = await request.formData();
    const file = formData.get('cookies') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No cookies file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cookie file is empty' },
        { status: 400 }
      );
    }

    // Save cookies
    const result = saveCookies(content);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('[Admin] Cookies uploaded successfully');

    return NextResponse.json({
      success: true,
      message: 'Cookies uploaded successfully',
    });

  } catch (error: any) {
    console.error('[Admin] Cookie upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload cookies' },
      { status: 500 }
    );
  }
}

// Delete cookies endpoint
export async function DELETE(request: NextRequest) {
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

    const { deleteCookies } = await import('@/lib/cookieManager');
    const result = deleteCookies();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('[Admin] Cookies deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Cookies deleted successfully',
    });

  } catch (error: any) {
    console.error('[Admin] Cookie delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete cookies' },
      { status: 500 }
    );
  }
}
