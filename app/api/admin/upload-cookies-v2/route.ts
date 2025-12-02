import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, addCookie } from '@/lib/cookieManagerV2';

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

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll('cookies'); // Support multiple files

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No cookie files provided' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each cookie file
    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push({ filename: 'unknown', error: 'Invalid file object' });
        continue;
      }

      const content = await file.text();
      const result = addCookie(content, file.name);

      if (result.success) {
        results.push({
          filename: file.name,
          cookieId: result.cookieId,
          success: true,
        });
      } else {
        errors.push({
          filename: file.name,
          error: result.error,
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[API] Error uploading cookies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload cookies' },
      { status: 500 }
    );
  }
}
