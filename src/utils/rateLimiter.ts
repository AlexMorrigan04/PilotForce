type RateLimitEntry = {
  count: number;
  firstAttempt: number;
  blocked: boolean;
};

class RateLimiter {
  private attempts: Record<string, RateLimitEntry> = {};
  private readonly MAX_ATTEMPTS = 5;
  private readonly TIMEFRAME_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  public checkLimit(key: string): boolean {
    const now = Date.now();
    const entry = this.attempts[key];

    // If no previous attempts or block has expired
    if (!entry) {
      this.attempts[key] = { count: 1, firstAttempt: now, blocked: false };
      return true;
    }

    // Check if currently blocked
    if (entry.blocked) {
      if (now - entry.firstAttempt > this.BLOCK_DURATION_MS) {
        // Block duration expired, reset
        this.attempts[key] = { count: 1, firstAttempt: now, blocked: false };
        return true;
      }
      return false; // Still blocked
    }

    // Reset if timeframe has passed
    if (now - entry.firstAttempt > this.TIMEFRAME_MS) {
      this.attempts[key] = { count: 1, firstAttempt: now, blocked: false };
      return true;
    }

    // Increment count and check if limit exceeded
    entry.count += 1;
    if (entry.count > this.MAX_ATTEMPTS) {
      entry.blocked = true;
      return false;
    }

    return true;
  }
}

export const loginRateLimiter = new RateLimiter();
