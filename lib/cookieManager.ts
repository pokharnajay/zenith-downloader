import * as fs from 'fs';
import * as path from 'path';

// Cookies are stored in a persistent data directory
export const COOKIES_PATH = '/app/data/cookies.txt';
export const DATA_DIR = '/app/data';

/**
 * Ensures the data directory exists
 */
export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o755 });
  }
}

/**
 * Check if cookies file exists
 */
export function cookiesExist(): boolean {
  try {
    return fs.existsSync(COOKIES_PATH);
  } catch (error) {
    return false;
  }
}

/**
 * Get cookie file age in days
 */
export function getCookieAge(): number | null {
  try {
    if (!cookiesExist()) return null;
    const stats = fs.statSync(COOKIES_PATH);
    const ageMs = Date.now() - stats.mtime.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    return null;
  }
}

/**
 * Get cookie file info
 */
export function getCookieInfo(): {
  exists: boolean;
  age: number | null;
  lastModified: string | null;
  size: number | null;
} {
  if (!cookiesExist()) {
    return {
      exists: false,
      age: null,
      lastModified: null,
      size: null,
    };
  }

  try {
    const stats = fs.statSync(COOKIES_PATH);
    return {
      exists: true,
      age: getCookieAge(),
      lastModified: stats.mtime.toISOString(),
      size: stats.size,
    };
  } catch (error) {
    return {
      exists: false,
      age: null,
      lastModified: null,
      size: null,
    };
  }
}

/**
 * Save cookies to file
 */
export function saveCookies(content: string): { success: boolean; error?: string } {
  try {
    ensureDataDir();

    // Validate it looks like a Netscape cookie file
    if (!content.includes('# Netscape HTTP Cookie File') && !content.includes('.youtube.com')) {
      return {
        success: false,
        error: 'Invalid cookie format. Please export cookies from YouTube using a browser extension.',
      };
    }

    fs.writeFileSync(COOKIES_PATH, content, { encoding: 'utf-8', mode: 0o644 });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save cookies',
    };
  }
}

/**
 * Delete cookies file
 */
export function deleteCookies(): { success: boolean; error?: string } {
  try {
    if (cookiesExist()) {
      fs.unlinkSync(COOKIES_PATH);
    }
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete cookies',
    };
  }
}

/**
 * Validate admin password
 */
export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no admin password is set, deny access for security
  if (!adminPassword) {
    console.error('[Admin] ADMIN_PASSWORD not set in environment variables');
    return false;
  }

  return password === adminPassword;
}

/**
 * Check if YouTube cookies are potentially invalid based on error message
 */
export function isYouTubeCookieError(errorMessage: string): boolean {
  const cookieErrorPatterns = [
    'Sign in to confirm you\'re not a bot',
    'This video is age restricted',
    'cookies are no longer valid',
    'cookies have been rotated',
    'login required',
  ];

  return cookieErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}
