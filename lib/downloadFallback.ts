import { spawn } from 'child_process';
import * as fs from 'fs';
import {
  getCurrentCookie,
  getNextCookie,
  markCookieSuccess,
  markCookieFailed,
  allCookiesBlocked,
  isCookieBlockedError,
  hasActiveCookies,
} from './cookieManagerV2';
import { warmupSessionAndGetCookies, cleanupOldChromiumCookies } from './chromiumWarmer';

export interface DownloadAttemptResult {
  success: boolean;
  process?: ReturnType<typeof spawn>;
  error?: string;
  cookieUsed?: string;
  fallbackMethod?: 'cookie' | 'rotation' | 'chromium';
  attemptsCount?: number;
}

/**
 * Try downloading with a specific cookie
 */
async function tryDownloadWithCookie(
  cookiePath: string | null,
  cookieId: string | null,
  url: string,
  args: string[]
): Promise<DownloadAttemptResult> {
  if (!cookiePath) {
    return {
      success: false,
      error: 'No cookie path provided',
    };
  }

  // Check if cookie file exists
  if (!fs.existsSync(cookiePath)) {
    return {
      success: false,
      error: 'Cookie file not found',
    };
  }

  try {
    // Add cookie argument
    const finalArgs = ['--cookies', cookiePath, ...args];

    console.log(`[DownloadFallback] Attempting download with cookie: ${cookieId || 'unknown'}`);

    // Spawn yt-dlp process
    const ytdlp = spawn('yt-dlp', finalArgs);

    // Wait a bit to see if it starts successfully
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if process is still running (not immediately failed)
    if (ytdlp.killed) {
      return {
        success: false,
        error: 'Process failed to start',
      };
    }

    // Mark cookie as successful
    if (cookieId) {
      markCookieSuccess(cookieId);
    }

    console.log(`[DownloadFallback] Download started successfully with cookie: ${cookieId || 'unknown'}`);

    return {
      success: true,
      process: ytdlp,
      cookieUsed: cookieId || 'unknown',
      fallbackMethod: 'cookie',
    };

  } catch (error: any) {
    console.error(`[DownloadFallback] Error with cookie ${cookieId}:`, error.message);

    // Mark cookie as failed
    if (cookieId) {
      markCookieFailed(cookieId, error.message);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main fallback chain for downloads
 */
export async function downloadWithFallback(
  url: string,
  ytdlpArgs: string[]
): Promise<DownloadAttemptResult> {
  let attemptsCount = 0;

  console.log('[DownloadFallback] Starting fallback chain for:', url);

  // ATTEMPT 1: Try with current cookie
  attemptsCount++;
  console.log(`[DownloadFallback] Attempt ${attemptsCount}: Using current cookie`);

  const current = getCurrentCookie();

  if (current.filepath && current.metadata) {
    const result = await tryDownloadWithCookie(
      current.filepath,
      current.metadata.id,
      url,
      ytdlpArgs
    );

    if (result.success) {
      return { ...result, attemptsCount };
    }

    console.log(`[DownloadFallback] Current cookie failed, rotating...`);
  }

  // ATTEMPT 2-N: Try all available cookies via rotation
  const maxRotations = 5; // Try up to 5 different cookies
  let rotationAttempts = 0;

  while (rotationAttempts < maxRotations && hasActiveCookies()) {
    attemptsCount++;
    rotationAttempts++;

    console.log(`[DownloadFallback] Attempt ${attemptsCount}: Rotating to next cookie (rotation ${rotationAttempts})`);

    const next = getNextCookie();

    if (!next.filepath || !next.metadata) {
      console.log('[DownloadFallback] No more cookies to try');
      break;
    }

    const result = await tryDownloadWithCookie(
      next.filepath,
      next.metadata.id,
      url,
      ytdlpArgs
    );

    if (result.success) {
      return {
        ...result,
        fallbackMethod: 'rotation',
        attemptsCount,
      };
    }

    console.log(`[DownloadFallback] Rotated cookie also failed`);

    // Small delay before next attempt
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ATTEMPT FINAL: Check if Chromium fallback should be used
  const chromiumEnabled = process.env.CHROMIUM_FALLBACK_ENABLED !== 'false';

  if (!chromiumEnabled) {
    console.log('[DownloadFallback] Chromium fallback is disabled');
    return {
      success: false,
      error: 'All cookies exhausted and Chromium fallback is disabled',
      attemptsCount,
    };
  }

  // Check if all cookies are actually blocked
  const allBlocked = allCookiesBlocked();

  if (!allBlocked) {
    console.log('[DownloadFallback] Some cookies are still active, not using Chromium');
    return {
      success: false,
      error: 'All available cookies failed but some are still active. Try again later.',
      attemptsCount,
    };
  }

  console.log('[DownloadFallback] ⚠️  All cookies are blocked! Attempting Chromium fallback...');
  attemptsCount++;

  // Clean up old temp cookies first
  await cleanupOldChromiumCookies(3600000); // 1 hour

  // Use Chromium to warm up session
  const warmup = await warmupSessionAndGetCookies(url);

  if (!warmup.success) {
    console.error('[DownloadFallback] Chromium fallback failed:', warmup.error);
    return {
      success: false,
      error: `All cookies blocked and Chromium fallback failed: ${warmup.error}`,
      attemptsCount,
    };
  }

  console.log('[DownloadFallback] Chromium warmup successful, trying download...');

  // Try download with Chromium-generated cookies
  const result = await tryDownloadWithCookie(
    warmup.cookiePath!,
    'chromium_temp',
    url,
    ytdlpArgs
  );

  // Schedule cleanup of temp cookie after 5 minutes
  if (warmup.cookiePath) {
    setTimeout(() => {
      try {
        if (fs.existsSync(warmup.cookiePath!)) {
          fs.unlinkSync(warmup.cookiePath!);
          console.log('[DownloadFallback] Cleaned up temporary Chromium cookie');
        }
      } catch (e) {
        console.error('[DownloadFallback] Error cleaning temp cookie:', e);
      }
    }, 5 * 60 * 1000);
  }

  if (result.success) {
    console.log('[DownloadFallback] ✓ Chromium fallback successful!');
    return {
      ...result,
      fallbackMethod: 'chromium',
      attemptsCount,
    };
  }

  // Complete failure
  console.error('[DownloadFallback] ✗ All fallback methods exhausted');

  return {
    success: false,
    error: 'All fallback methods failed. Please upload fresh cookies or try again later.',
    attemptsCount,
  };
}

/**
 * Quick check if cookies are available (for fast endpoint responses)
 */
export function quickCookieCheck(): {
  available: boolean;
  message?: string;
} {
  if (!hasActiveCookies()) {
    return {
      available: false,
      message: 'No active cookies available. Please upload cookies via /admin',
    };
  }

  return {
    available: true,
  };
}

/**
 * Get fallback system status
 */
export function getFallbackStatus(): {
  hasCookies: boolean;
  allBlocked: boolean;
  chromiumAvailable: boolean;
  chromiumEnabled: boolean;
} {
  return {
    hasCookies: hasActiveCookies(),
    allBlocked: allCookiesBlocked(),
    chromiumAvailable: true, // Will be checked dynamically when needed
    chromiumEnabled: process.env.CHROMIUM_FALLBACK_ENABLED !== 'false',
  };
}
