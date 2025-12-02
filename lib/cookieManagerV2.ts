import * as fs from 'fs';
import * as path from 'path';

// Directory structure for multi-cookie support
// Use /app/data in production (Docker), ./.data in development (local)
const isDev = process.env.NODE_ENV !== 'production';
export const DATA_DIR = isDev ? path.join(process.cwd(), '.data') : '/app/data';
export const COOKIES_DIR = path.join(DATA_DIR, 'cookies');
export const COOKIE_STATUS_FILE = path.join(DATA_DIR, 'cookie_status.json');
export const TEMP_CHROMIUM_DIR = path.join(COOKIES_DIR, 'temp_chromium');

// Cookie status types
export type CookieStatus = 'active' | 'blocked' | 'expired' | 'error' | 'untested';

export interface CookieMetadata {
  id: string;
  filename: string;
  uploadedAt: string;
  lastChecked: string | null;
  status: CookieStatus;
  failureCount: number;
  successCount: number;
  lastError: string | null;
  priority: number; // For manual ordering
}

export interface CookieStatusData {
  cookies: CookieMetadata[];
  currentIndex: number;
  lastRotation: string | null;
  chromiumFallbackEnabled: boolean;
  chromiumUsageCount: number;
  lastHealthCheck: string | null;
}

/**
 * Ensures all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [DATA_DIR, COOKIES_DIR, TEMP_CHROMIUM_DIR];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  }
}

/**
 * Load cookie status metadata
 */
export function loadCookieStatus(): CookieStatusData {
  try {
    if (fs.existsSync(COOKIE_STATUS_FILE)) {
      const data = fs.readFileSync(COOKIE_STATUS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[CookieManager] Error loading status:', error);
  }

  // Return default structure
  return {
    cookies: [],
    currentIndex: 0,
    lastRotation: null,
    chromiumFallbackEnabled: true,
    chromiumUsageCount: 0,
    lastHealthCheck: null,
  };
}

/**
 * Save cookie status metadata
 */
export function saveCookieStatus(status: CookieStatusData): void {
  try {
    ensureDirectories();
    fs.writeFileSync(
      COOKIE_STATUS_FILE,
      JSON.stringify(status, null, 2),
      { encoding: 'utf-8', mode: 0o644 }
    );
  } catch (error) {
    console.error('[CookieManager] Error saving status:', error);
    throw error;
  }
}

/**
 * Generate unique cookie ID
 */
export function generateCookieId(): string {
  return `cookie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate cookie file content
 */
export function validateCookieContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Cookie file is empty' };
  }

  // Check for Netscape format OR YouTube domains
  const hasNetscapeHeader = content.includes('# Netscape HTTP Cookie File');
  const hasYouTubeDomain = content.includes('.youtube.com') || content.includes('youtube.com');

  if (!hasNetscapeHeader && !hasYouTubeDomain) {
    return {
      valid: false,
      error: 'Invalid cookie format. Please export cookies from YouTube in Netscape format.',
    };
  }

  return { valid: true };
}

/**
 * Add a new cookie file
 */
export function addCookie(content: string, originalFilename?: string): {
  success: boolean;
  cookieId?: string;
  error?: string;
} {
  try {
    // Validate content
    const validation = validateCookieContent(content);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    ensureDirectories();

    // Generate unique ID
    const cookieId = generateCookieId();
    const filename = `${cookieId}.txt`;
    const filepath = path.join(COOKIES_DIR, filename);

    // Save cookie file
    fs.writeFileSync(filepath, content, { encoding: 'utf-8', mode: 0o644 });

    // Load current status
    const status = loadCookieStatus();

    // Add metadata
    const metadata: CookieMetadata = {
      id: cookieId,
      filename,
      uploadedAt: new Date().toISOString(),
      lastChecked: null,
      status: 'untested',
      failureCount: 0,
      successCount: 0,
      lastError: null,
      priority: status.cookies.length, // Default priority based on order
    };

    status.cookies.push(metadata);
    saveCookieStatus(status);

    console.log(`[CookieManager] Added cookie: ${cookieId} (${originalFilename || 'unknown'})`);

    return { success: true, cookieId };
  } catch (error: any) {
    console.error('[CookieManager] Error adding cookie:', error);
    return {
      success: false,
      error: error.message || 'Failed to add cookie',
    };
  }
}

/**
 * Delete a specific cookie
 */
export function deleteCookie(cookieId: string): { success: boolean; error?: string } {
  try {
    const status = loadCookieStatus();
    const cookieIndex = status.cookies.findIndex(c => c.id === cookieId);

    if (cookieIndex === -1) {
      return { success: false, error: 'Cookie not found' };
    }

    const cookie = status.cookies[cookieIndex];
    const filepath = path.join(COOKIES_DIR, cookie.filename);

    // Delete file if exists
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Remove from metadata
    status.cookies.splice(cookieIndex, 1);

    // Adjust currentIndex if needed
    if (status.currentIndex >= status.cookies.length) {
      status.currentIndex = Math.max(0, status.cookies.length - 1);
    }

    saveCookieStatus(status);

    console.log(`[CookieManager] Deleted cookie: ${cookieId}`);

    return { success: true };
  } catch (error: any) {
    console.error('[CookieManager] Error deleting cookie:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete cookie',
    };
  }
}

/**
 * Get all cookies
 */
export function getAllCookies(): CookieMetadata[] {
  const status = loadCookieStatus();
  return status.cookies;
}

/**
 * Get currently active cookie
 */
export function getCurrentCookie(): {
  metadata: CookieMetadata | null;
  filepath: string | null;
} {
  const status = loadCookieStatus();

  if (status.cookies.length === 0) {
    return { metadata: null, filepath: null };
  }

  // Get active cookies only
  const activeCookies = status.cookies.filter(c => c.status === 'active' || c.status === 'untested');

  if (activeCookies.length === 0) {
    // No active cookies, try to use any available cookie
    if (status.cookies.length > 0) {
      const cookie = status.cookies[0];
      return {
        metadata: cookie,
        filepath: path.join(COOKIES_DIR, cookie.filename),
      };
    }
    return { metadata: null, filepath: null };
  }

  // Use currentIndex to get cookie (with wraparound)
  const index = status.currentIndex % activeCookies.length;
  const cookie = activeCookies[index];

  return {
    metadata: cookie,
    filepath: path.join(COOKIES_DIR, cookie.filename),
  };
}

/**
 * Get next cookie in rotation
 */
export function getNextCookie(): {
  metadata: CookieMetadata | null;
  filepath: string | null;
} {
  const status = loadCookieStatus();

  // Get active cookies only
  const activeCookies = status.cookies.filter(c => c.status === 'active' || c.status === 'untested');

  if (activeCookies.length === 0) {
    return { metadata: null, filepath: null };
  }

  // Move to next cookie
  status.currentIndex = (status.currentIndex + 1) % activeCookies.length;
  status.lastRotation = new Date().toISOString();
  saveCookieStatus(status);

  const cookie = activeCookies[status.currentIndex];

  console.log(`[CookieManager] Rotated to cookie: ${cookie.id}`);

  return {
    metadata: cookie,
    filepath: path.join(COOKIES_DIR, cookie.filename),
  };
}

/**
 * Rotate to next available cookie
 */
export function rotateCookie(): {
  metadata: CookieMetadata | null;
  filepath: string | null;
} {
  return getNextCookie();
}

/**
 * Mark cookie as failed
 */
export function markCookieFailed(cookieId: string, error: string): void {
  const status = loadCookieStatus();
  const cookie = status.cookies.find(c => c.id === cookieId);

  if (!cookie) return;

  cookie.failureCount++;
  cookie.lastError = error;
  cookie.lastChecked = new Date().toISOString();

  // Auto-mark as blocked if failure count exceeds threshold
  const threshold = parseInt(process.env.COOKIE_FAILURE_THRESHOLD || '3', 10);
  if (cookie.failureCount >= threshold) {
    cookie.status = 'blocked';
    console.log(`[CookieManager] Cookie ${cookieId} marked as BLOCKED (${cookie.failureCount} failures)`);
  }

  saveCookieStatus(status);
}

/**
 * Mark cookie as successful
 */
export function markCookieSuccess(cookieId: string): void {
  const status = loadCookieStatus();
  const cookie = status.cookies.find(c => c.id === cookieId);

  if (!cookie) return;

  cookie.successCount++;
  cookie.lastChecked = new Date().toISOString();
  cookie.status = 'active';
  cookie.lastError = null;

  // Reset failure count on success
  cookie.failureCount = 0;

  saveCookieStatus(status);
}

/**
 * Get statistics
 */
export function getCookieStats(): {
  total: number;
  active: number;
  blocked: number;
  expired: number;
  untested: number;
  error: number;
} {
  const status = loadCookieStatus();

  return {
    total: status.cookies.length,
    active: status.cookies.filter(c => c.status === 'active').length,
    blocked: status.cookies.filter(c => c.status === 'blocked').length,
    expired: status.cookies.filter(c => c.status === 'expired').length,
    untested: status.cookies.filter(c => c.status === 'untested').length,
    error: status.cookies.filter(c => c.status === 'error').length,
  };
}

/**
 * Check if any active cookies are available
 */
export function hasActiveCookies(): boolean {
  const stats = getCookieStats();
  return stats.active > 0 || stats.untested > 0;
}

/**
 * Check if all cookies are blocked
 */
export function allCookiesBlocked(): boolean {
  const status = loadCookieStatus();

  if (status.cookies.length === 0) return true;

  const allBlocked = status.cookies.every(
    c => c.status === 'blocked' || c.status === 'expired' || c.status === 'error'
  );

  return allBlocked;
}

/**
 * Increment Chromium usage counter
 */
export function incrementChromiumUsage(): void {
  const status = loadCookieStatus();
  status.chromiumUsageCount++;
  saveCookieStatus(status);
}

/**
 * Update last health check timestamp
 */
export function updateHealthCheckTimestamp(): void {
  const status = loadCookieStatus();
  status.lastHealthCheck = new Date().toISOString();
  saveCookieStatus(status);
}

/**
 * Validate admin password
 */
export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[Admin] ADMIN_PASSWORD not set in environment variables');
    return false;
  }

  return password === adminPassword;
}

/**
 * Check if error message indicates cookie issue
 */
export function isCookieBlockedError(errorMessage: string): boolean {
  const blockedPatterns = [
    'Sign in to confirm you\'re not a bot',
    'Sign in to confirm your age',
    'This video is age restricted',
    'cookies are no longer valid',
    'cookies have been rotated',
    'login required',
    'HTTP Error 403',
    'bot detection',
    'Video unavailable',
  ];

  return blockedPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Clean up old temporary Chromium cookies
 */
export function cleanupTempChromiumCookies(): void {
  try {
    if (!fs.existsSync(TEMP_CHROMIUM_DIR)) return;

    const files = fs.readdirSync(TEMP_CHROMIUM_DIR);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const file of files) {
      const filepath = path.join(TEMP_CHROMIUM_DIR, file);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        console.log(`[CookieManager] Cleaned up old temp cookie: ${file}`);
      }
    }
  } catch (error) {
    console.error('[CookieManager] Error cleaning temp cookies:', error);
  }
}

// Legacy compatibility functions (for backward compatibility)
export function cookiesExist(): boolean {
  return hasActiveCookies();
}

export function getCookieInfo() {
  const current = getCurrentCookie();

  if (!current.metadata) {
    return {
      exists: false,
      age: null,
      lastModified: null,
      size: null,
    };
  }

  return {
    exists: true,
    age: current.metadata.uploadedAt
      ? Math.floor((Date.now() - new Date(current.metadata.uploadedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    lastModified: current.metadata.lastChecked,
    size: current.filepath && fs.existsSync(current.filepath)
      ? fs.statSync(current.filepath).size
      : null,
  };
}
