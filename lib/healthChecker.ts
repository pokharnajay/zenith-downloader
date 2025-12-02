import { spawn } from 'child_process';
import * as path from 'path';
import {
  loadCookieStatus,
  saveCookieStatus,
  updateHealthCheckTimestamp,
  COOKIES_DIR,
  type CookieStatus,
} from './cookieManagerV2';

// Test video IDs (public, reliable videos for health checks)
const TEST_VIDEOS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'jNQXAC9IVRw', // Me at the zoo (first YouTube video)
  '9bZkp7q19f0', // PSY - Gangnam Style
];

/**
 * Test a single cookie file
 */
export async function testCookie(cookiePath: string): Promise<{
  status: CookieStatus;
  error?: string;
}> {
  try {
    // Use a random test video to avoid rate limiting
    const testVideo = TEST_VIDEOS[Math.floor(Math.random() * TEST_VIDEOS.length)];
    const testUrl = `https://www.youtube.com/watch?v=${testVideo}`;

    console.log(`[HealthCheck] Testing cookie: ${path.basename(cookiePath)} with video ${testVideo}`);

    const result = await executeYtdlp([
      '--cookies', cookiePath,
      '--dump-json',
      '--no-warnings',
      '--quiet',
      testUrl,
    ], 15000); // 15 second timeout

    if (result.success) {
      console.log(`[HealthCheck] Cookie ${path.basename(cookiePath)}: ACTIVE ✓`);
      return { status: 'active' };
    }

    // Parse error message
    const errorLower = result.error.toLowerCase();

    if (errorLower.includes('sign in to confirm')) {
      console.log(`[HealthCheck] Cookie ${path.basename(cookiePath)}: BLOCKED (bot detection)`);
      return { status: 'blocked', error: 'Bot detection triggered' };
    }

    if (errorLower.includes('cookies are no longer valid') || errorLower.includes('login required')) {
      console.log(`[HealthCheck] Cookie ${path.basename(cookiePath)}: EXPIRED`);
      return { status: 'expired', error: 'Cookies expired or invalid' };
    }

    if (errorLower.includes('http error 403')) {
      console.log(`[HealthCheck] Cookie ${path.basename(cookiePath)}: BLOCKED (HTTP 403)`);
      return { status: 'blocked', error: 'Access forbidden (403)' };
    }

    // Unknown error
    console.log(`[HealthCheck] Cookie ${path.basename(cookiePath)}: ERROR`);
    return { status: 'error', error: result.error.substring(0, 200) };

  } catch (error: any) {
    console.error(`[HealthCheck] Cookie ${path.basename(cookiePath)}: ERROR -`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Execute yt-dlp command with timeout
 */
function executeYtdlp(args: string[], timeout: number): Promise<{
  success: boolean;
  output?: string;
  error: string;
}> {
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    let timedOut = false;

    const process = spawn('yt-dlp', args);

    const timer = setTimeout(() => {
      timedOut = true;
      process.kill();
      resolve({ success: false, error: 'Timeout after 15 seconds' });
    }, timeout);

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) return;

      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({
          success: false,
          error: errorOutput || output || `Process exited with code ${code}`,
        });
      }
    });

    process.on('error', (error) => {
      clearTimeout(timer);
      if (!timedOut) {
        resolve({ success: false, error: error.message });
      }
    });
  });
}

/**
 * Check health of all cookies
 */
export async function checkAllCookiesHealth(): Promise<{
  tested: number;
  active: number;
  blocked: number;
  expired: number;
  errors: number;
}> {
  console.log('[HealthCheck] Starting health check for all cookies...');

  const status = loadCookieStatus();
  let active = 0;
  let blocked = 0;
  let expired = 0;
  let errors = 0;

  for (const cookie of status.cookies) {
    const cookiePath = path.join(COOKIES_DIR, cookie.filename);

    // Test the cookie
    const result = await testCookie(cookiePath);

    // Update metadata
    cookie.status = result.status;
    cookie.lastChecked = new Date().toISOString();
    cookie.lastError = result.error || null;

    // Count by status
    switch (result.status) {
      case 'active':
        active++;
        break;
      case 'blocked':
        blocked++;
        break;
      case 'expired':
        expired++;
        break;
      case 'error':
        errors++;
        break;
    }

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Update status file
  updateHealthCheckTimestamp();
  saveCookieStatus(status);

  const summary = {
    tested: status.cookies.length,
    active,
    blocked,
    expired,
    errors,
  };

  console.log('[HealthCheck] Health check completed:', summary);

  // Log warning if all cookies are problematic
  if (active === 0 && status.cookies.length > 0) {
    console.warn('[HealthCheck] ⚠️  WARNING: No active cookies available!');
  }

  return summary;
}

/**
 * Start automatic health check scheduler
 */
export function startHealthCheckScheduler(): NodeJS.Timeout {
  const intervalMs = parseInt(process.env.HEALTH_CHECK_INTERVAL || '3600000', 10); // Default: 60 minutes

  console.log(`[HealthCheck] Scheduler started (interval: ${intervalMs / 1000 / 60} minutes)`);

  // Run first check after 5 minutes
  setTimeout(() => {
    checkAllCookiesHealth().catch(error => {
      console.error('[HealthCheck] Error in scheduled health check:', error);
    });
  }, 5 * 60 * 1000);

  // Then run periodically
  const interval = setInterval(() => {
    checkAllCookiesHealth().catch(error => {
      console.error('[HealthCheck] Error in scheduled health check:', error);
    });
  }, intervalMs);

  return interval;
}
