/**
 * Security, Anti-Scraper & Code Protection Utility Module
 * Protects frontend code from scrapers, download tools, devtools inspection, and frame-jacking.
 */

const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 messages per 5 minutes window per client

const STORAGE_KEY_TIMESTAMPS = 'lynzx_req_timestamps_v1';

/**
 * Checks if client has exceeded rate limit (Max requests within 5 mins)
 * Returns object with boolean `allowed` and remaining cooldown time in seconds if blocked.
 */
export function checkRateLimit(): { allowed: boolean; waitSeconds: number } {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(STORAGE_KEY_TIMESTAMPS);
    let timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Filter out timestamps older than 5 minutes
    timestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = timestamps[0];
      const timeElapsed = now - oldestInWindow;
      const waitMs = RATE_LIMIT_WINDOW - timeElapsed;
      const waitSeconds = Math.ceil(waitMs / 1000);
      return { allowed: false, waitSeconds: Math.max(waitSeconds, 1) };
    }

    // Record new request timestamp
    timestamps.push(now);
    localStorage.setItem(STORAGE_KEY_TIMESTAMPS, JSON.stringify(timestamps));

    return { allowed: true, waitSeconds: 0 };
  } catch {
    return { allowed: true, waitSeconds: 0 };
  }
}

/**
 * Detects if the current window is being scraped by automated tools or bots
 */
export function isScraperBot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Check for Selenium / Puppeteer / Automated WebDriver
  if (navigator.webdriver) return true;

  const ua = (navigator.userAgent || '').toLowerCase();
  const knownScrapers = [
    'httrack', 'sitesucker', 'teleport', 'wget', 'python-urllib',
    'scrapy', 'go-http-client', 'curl', 'offline explorer', 'webcopier',
    'fetcher', 'grabber', 'extractor'
  ];

  return knownScrapers.some(bot => ua.includes(bot));
}

/**
 * Enables anti-inspect, anti-scraper & code protection scripts
 * - Disables right-click context menu
 * - Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
 * - Prevents iframe embedding / clickjacking
 * - Disables image drag & drop
 */
export function enableCodeProtection(): () => void {
  // 1. Framebusting / Anti-Clickjacking: Prevent being framed in malicious scraper sites
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // Blocked cross-origin frame access
  }

  // 2. Disable right-click context menu
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // 3. Block Developer Tools & View Source Keyboard Shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element selector)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }

    // Cmd+Alt+I / Cmd+Alt+J / Cmd+Alt+U on Mac
    if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      return false;
    }
  };

  // 4. Disable Image & Text Dragging
  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Attach event listeners
  document.addEventListener('contextmenu', handleContextMenu, false);
  document.addEventListener('keydown', handleKeyDown, false);
  document.addEventListener('dragstart', handleDragStart, false);

  // Security Console Warning Banner
  try {
    console.log(
      "%cLYNZX SYSTEM PROTECTED %c\nUnauthorized scraping, copying, or inspection of this application is prohibited.",
      "color: #ef4444; font-size: 20px; font-weight: bold;",
      "color: #a855f7; font-size: 12px;"
    );
  } catch {
    // Ignore console errors
  }

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('dragstart', handleDragStart);
  };
}
