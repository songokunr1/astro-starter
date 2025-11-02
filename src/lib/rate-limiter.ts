const userRequestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * Checks if a user has exceeded the rate limit.
 * This is a simple in-memory implementation.
 *
 * @param userId The ID of the user to check.
 * @returns An object indicating if the request is allowed and when to retry if not.
 */
export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userTimestamps = userRequestTimestamps.get(userId) ?? [];

  // Filter out timestamps that are outside the current window
  const recentTimestamps = userTimestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    // Find the oldest request in the current window to calculate when the user can try again
    const oldestRequest = recentTimestamps[0];
    const retryAfter = Math.ceil((oldestRequest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Add the current request timestamp
  recentTimestamps.push(now);
  userRequestTimestamps.set(userId, recentTimestamps);

  return { allowed: true };
}
