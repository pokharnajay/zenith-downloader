# 🔐 Advanced Cookie & Bot Detection Solution Plan

## 🎯 Goals

1. **Multi-cookie rotation** - Upload multiple cookie files, rotate through them
2. **Graceful degradation** - System stays up even if some cookies are blocked
3. **Auto-health checks** - Validate cookies every 60 minutes
4. **Chromium fallback** - Use headless browser for extreme cases

---

## 📋 System Architecture

### Cookie Storage Structure
```
/app/data/cookies/
├── cookie_1.txt (primary)
├── cookie_2.txt (backup)
├── cookie_3.txt (backup)
├── cookie_status.json (metadata)
└── temp_chromium_cookies/ (temporary sessions)
```

### Cookie Status Metadata
```json
{
  "cookies": [
    {
      "id": "cookie_1",
      "filename": "cookie_1.txt",
      "uploadedAt": "2025-01-15T10:30:00Z",
      "lastChecked": "2025-01-15T12:00:00Z",
      "status": "active", // active, blocked, expired, error
      "failureCount": 0,
      "lastError": null,
      "successCount": 142
    },
    {
      "id": "cookie_2",
      "filename": "cookie_2.txt",
      "uploadedAt": "2025-01-15T10:35:00Z",
      "lastChecked": "2025-01-15T12:00:00Z",
      "status": "active",
      "failureCount": 0,
      "lastError": null,
      "successCount": 89
    }
  ],
  "currentIndex": 0,
  "lastRotation": "2025-01-15T11:45:00Z",
  "chromiumFallbackEnabled": true,
  "chromiumUsageCount": 5
}
```

---

## 🔄 Implementation Plan

### Phase 1: Multi-Cookie Upload & Storage

#### 1.1 Update Cookie Manager (`lib/cookieManager.ts`)
- [ ] Change from single file to multi-file support
- [ ] Add cookie metadata management
- [ ] Implement cookie rotation logic
- [ ] Add cookie health status tracking

#### 1.2 Update Admin Upload API (`app/api/admin/upload-cookies/route.ts`)
- [ ] Support multiple file uploads
- [ ] Generate unique IDs for each cookie file
- [ ] Update metadata JSON
- [ ] Return list of uploaded cookies

#### 1.3 Update Admin UI (`app/admin/page.tsx`)
- [ ] Multi-file upload input
- [ ] Display list of all cookies with status
- [ ] Show which cookie is currently active
- [ ] Add delete individual cookie button
- [ ] Show success/failure counts per cookie

---

### Phase 2: Cookie Rotation System

#### 2.1 Rotation Logic
```typescript
// Rotation strategies:
1. Round-robin (default) - cycle through all active cookies
2. Least-used - use cookie with lowest usage count
3. Health-based - prefer cookies with best success rate
```

#### 2.2 Auto-Rotation Triggers
- [ ] After N failures with current cookie (N = 3)
- [ ] Manual rotation via admin panel
- [ ] Scheduled rotation (optional)

#### 2.3 Integration Points
- [ ] `app/api/stream-download/route.ts` - use rotating cookies
- [ ] `app/api/py-analyze/route.ts` - use rotating cookies
- [ ] `app/api/py-download/route.ts` - use rotating cookies

---

### Phase 3: Health Check System

#### 3.1 Background Health Checker (`lib/healthChecker.ts`)
- [ ] Run every 60 minutes
- [ ] Test each cookie with a simple video
- [ ] Update cookie status in metadata
- [ ] Mark blocked/expired cookies
- [ ] Send notifications if all cookies fail

#### 3.2 Health Check Implementation
```typescript
async function checkCookieHealth(cookiePath: string): Promise<{
  status: 'active' | 'blocked' | 'expired' | 'error',
  error?: string
}> {
  // Test with a known public video
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

  // Try to get video info with this cookie
  const result = await execYtdlp([
    '--cookies', cookiePath,
    '--dump-json',
    `https://www.youtube.com/watch?v=${testVideoId}`
  ]);

  // Parse result and determine status
  if (result.includes('Sign in to confirm')) return { status: 'blocked' };
  if (result.includes('cookies are no longer valid')) return { status: 'expired' };
  if (result.error) return { status: 'error', error: result.error };

  return { status: 'active' };
}
```

#### 3.3 Health Check Scheduler
- [ ] Use Node.js `setInterval` or cron-like system
- [ ] Run in background (Next.js instrumentation)
- [ ] Persist results to `cookie_status.json`

---

### Phase 4: Headless Chromium Fallback

#### 4.1 Install Puppeteer (`package.json`)
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

#### 4.2 Chromium Service (`lib/chromiumWarmer.ts`)
```typescript
import puppeteer from 'puppeteer';

export async function warmupSessionAndGetCookies(videoUrl: string): Promise<{
  success: boolean,
  cookiePath?: string,
  error?: string
}> {
  let browser;

  try {
    // Launch headless Chromium with stealth
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    });

    const page = await browser.newPage();

    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Load YouTube video page
    await page.goto(videoUrl, {
      waitUntil: 'networkidle2',
      timeout: 5000
    });

    // Wait random time (700ms - 2000ms) to simulate human
    const waitTime = 700 + Math.random() * 1300;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Extract cookies
    const cookies = await page.cookies();

    // Convert to Netscape format
    const netscapeCookies = convertToNetscapeFormat(cookies);

    // Save to temporary file
    const tempCookiePath = `/app/data/cookies/temp_chromium_${Date.now()}.txt`;
    await fs.promises.writeFile(tempCookiePath, netscapeCookies);

    return { success: true, cookiePath: tempCookiePath };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) await browser.close();
  }
}

function convertToNetscapeFormat(cookies: any[]): string {
  let output = '# Netscape HTTP Cookie File\n';

  for (const cookie of cookies) {
    const line = [
      cookie.domain,
      cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE',
      cookie.path,
      cookie.secure ? 'TRUE' : 'FALSE',
      cookie.expires || '0',
      cookie.name,
      cookie.value
    ].join('\t');

    output += line + '\n';
  }

  return output;
}
```

#### 4.3 Update Dockerfile
```dockerfile
# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

---

### Phase 5: Fallback Chain Implementation

#### 5.1 Download Flow with Fallback
```typescript
async function downloadWithFallback(videoUrl: string, format: string) {
  // ATTEMPT 1: Try with current cookie
  let result = await tryDownloadWithCookie(getCurrentCookie(), videoUrl, format);
  if (result.success) return result;

  // ATTEMPT 2: Rotate to next cookie and retry
  rotateCookie();
  result = await tryDownloadWithCookie(getCurrentCookie(), videoUrl, format);
  if (result.success) return result;

  // ATTEMPT 3: Try all remaining cookies
  const cookies = getAvailableCookies();
  for (const cookie of cookies) {
    result = await tryDownloadWithCookie(cookie, videoUrl, format);
    if (result.success) return result;
  }

  // ATTEMPT 4: Check if all cookies are blocked
  const allBlocked = await checkAllCookiesBlocked();
  if (!allBlocked) {
    return { success: false, error: 'All cookies exhausted' };
  }

  // ATTEMPT 5: Use Chromium fallback (last resort)
  console.log('All cookies blocked, using Chromium fallback...');
  const warmup = await warmupSessionAndGetCookies(videoUrl);

  if (!warmup.success) {
    return { success: false, error: 'Chromium fallback failed' };
  }

  // Try download with fresh Chromium cookies
  result = await tryDownloadWithCookie(warmup.cookiePath, videoUrl, format);

  // Clean up temp cookie file
  await fs.promises.unlink(warmup.cookiePath);

  return result;
}
```

#### 5.2 Error Detection
```typescript
function isCookieBlockedError(errorMessage: string): boolean {
  const blockedPatterns = [
    'Sign in to confirm you\'re not a bot',
    'cookies are no longer valid',
    'This video requires payment',
    'Video unavailable',
    'HTTP Error 403',
    'bot detection'
  ];

  return blockedPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}
```

---

### Phase 6: Admin Panel Enhancements

#### 6.1 Cookie Management UI Features
- [ ] Upload multiple cookies at once (drag & drop)
- [ ] List all cookies with status badges:
  - 🟢 Active (working)
  - 🟡 Warning (low success rate)
  - 🔴 Blocked (detected as bot)
  - ⚫ Expired (needs refresh)
- [ ] Show stats per cookie:
  - Upload date
  - Last checked
  - Success count / Failure count
  - Success rate percentage
- [ ] Manual rotation button
- [ ] Test individual cookie button
- [ ] Delete individual cookie
- [ ] Set priority/order

#### 6.2 System Status Dashboard
- [ ] Show current active cookie
- [ ] Display next health check time
- [ ] Show Chromium fallback stats
- [ ] Alert if all cookies are failing
- [ ] Download health history

---

## 🔧 Technical Implementation Details

### File Structure
```
lib/
├── cookieManager.ts (multi-cookie support)
├── cookieRotation.ts (rotation logic)
├── healthChecker.ts (60min health checks)
├── chromiumWarmer.ts (browser fallback)
└── downloadFallback.ts (orchestration)

app/api/admin/
├── upload-cookies/route.ts (multi-upload)
├── cookie-status/route.ts (list all)
├── delete-cookie/route.ts (delete one)
├── rotate-cookie/route.ts (manual rotation)
└── test-cookie/route.ts (test one)
```

### Environment Variables
```env
# Cookie rotation settings
COOKIE_ROTATION_STRATEGY=round-robin  # round-robin, least-used, health-based
COOKIE_FAILURE_THRESHOLD=3  # Rotate after N failures
HEALTH_CHECK_INTERVAL=3600000  # 60 minutes in ms

# Chromium fallback
CHROMIUM_FALLBACK_ENABLED=true
CHROMIUM_WARMUP_MIN_WAIT=700  # ms
CHROMIUM_WARMUP_MAX_WAIT=2000  # ms

# Admin
ADMIN_PASSWORD=your-secure-password
```

---

## 📊 Monitoring & Logging

### Metrics to Track
- Total downloads per cookie
- Success rate per cookie
- Cookie rotation frequency
- Chromium fallback usage count
- Average response time
- Error types distribution

### Logging Examples
```
[2025-01-15 12:30:15] Cookie cookie_1: Download success (143/143)
[2025-01-15 12:35:22] Cookie cookie_1: Blocked detected, rotating...
[2025-01-15 12:35:23] Rotated to cookie_2
[2025-01-15 12:35:25] Cookie cookie_2: Download success (90/90)
[2025-01-15 13:30:00] Health check started for 3 cookies
[2025-01-15 13:30:15] cookie_1: BLOCKED, cookie_2: ACTIVE, cookie_3: ACTIVE
[2025-01-15 14:22:10] All cookies blocked, initiating Chromium fallback...
[2025-01-15 14:22:12] Chromium warmup successful, generated temp cookies
[2025-01-15 14:22:15] Download success with Chromium cookies
```

---

## 🎯 Success Criteria

✅ Can upload 3+ cookie files simultaneously
✅ Automatic rotation on cookie failure (< 1 second)
✅ Health checks run every 60 minutes
✅ System stays operational with 1+ working cookie
✅ Chromium fallback works for blocked videos
✅ Admin panel shows real-time cookie status
✅ Zero downtime during cookie rotation
✅ Graceful degradation (no "503 maintenance" for users)

---

## 🚀 Rollout Plan

### Phase 1 (Week 1)
- Multi-cookie upload
- Basic rotation logic
- Admin UI updates

### Phase 2 (Week 1)
- Health check system
- Auto-rotation on failure
- Status tracking

### Phase 3 (Week 2)
- Chromium integration
- Fallback chain
- Docker updates

### Phase 4 (Week 2)
- Testing & refinement
- Monitoring setup
- Documentation

---

## 🔍 Testing Strategy

### Test Cases
1. **Happy path**: All cookies work → use round-robin
2. **Single failure**: Cookie 1 fails → rotate to cookie 2
3. **All blocked**: All cookies blocked → trigger Chromium
4. **Partial failure**: 2/3 cookies work → skip blocked ones
5. **Health check**: Simulate 60min interval → verify status updates
6. **Concurrent downloads**: Multiple users → verify no race conditions
7. **Cookie upload**: Upload 5 files → verify all stored correctly
8. **Manual rotation**: Admin clicks rotate → verify immediate switch

### Test Videos
- Public video (unrestricted)
- Age-restricted video
- Regional-blocked video
- Premium/paid video
- Recently uploaded video (fresh bot checks)

---

## 📦 Deployment Notes

### New Docker Dependencies
```dockerfile
# Add Chromium + Puppeteer
RUN apk add --no-cache chromium nss freetype harfbuzz
RUN npm install puppeteer
```

### Environment Setup
```bash
# Production .env
COOKIE_ROTATION_STRATEGY=round-robin
COOKIE_FAILURE_THRESHOLD=3
HEALTH_CHECK_INTERVAL=3600000
CHROMIUM_FALLBACK_ENABLED=true
CHROMIUM_WARMUP_MIN_WAIT=700
CHROMIUM_WARMUP_MAX_WAIT=2000
```

### Migration from Single Cookie
```bash
# Automatically migrate existing cookie to new structure
# Old: /app/data/cookies.txt
# New: /app/data/cookies/cookie_1.txt
```

---

This plan ensures **zero downtime** and **maximum reliability** against YouTube bot detection! 🎉
