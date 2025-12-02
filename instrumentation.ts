/**
 * Next.js Instrumentation Hook
 * Runs on server startup to initialize background services
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing server...');

    // Dynamic import to avoid issues with edge runtime
    const { ensureDirectories } = await import('./lib/cookieManagerV2');
    const { startHealthCheckScheduler } = await import('./lib/healthChecker');
    const { cleanupOldChromiumCookies } = await import('./lib/chromiumWarmer');

    try {
      // Ensure cookie directories exist
      ensureDirectories();
      console.log('[Instrumentation] Cookie directories initialized');

      // Clean up old temporary Chromium cookies
      await cleanupOldChromiumCookies(3600000); // 1 hour
      console.log('[Instrumentation] Cleaned up old temporary cookies');

      // Start background health check scheduler
      startHealthCheckScheduler();
      console.log('[Instrumentation] Health check scheduler started');

    } catch (error) {
      console.error('[Instrumentation] Error during initialization:', error);
    }
  }
}
