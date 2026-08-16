/**
 * Security & Anti-Inspection Utility Module
 * Protects frontend code from right-click inspect, devtools shortcuts, and enforces rate limits.
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
 * Enables anti-inspect & code protection scripts
 * - Disables right-click context menu
 * - Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
 */
export function enableCodeProtection(): () => void {
  // Disable right-click context menu
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Block Developer Tools Keyboard Shortcuts
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

    // Cmd+Alt+I / Cmd+Alt+J on Mac
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

  // Attach event listeners
  document.addEventListener('contextmenu', handleContextMenu, false);
  document.addEventListener('keydown', handleKeyDown, false);

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);
  };
}
