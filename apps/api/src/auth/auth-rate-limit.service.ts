import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type RateBucket = { count: number; resetsAt: number };

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateBucket>();

  assertAllowed(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetsAt <= now) {
      this.buckets.set(key, { count: 1, resetsAt: now + windowMs });
      return;
    }

    if (current.count >= limit) {
      throw new HttpException(
        "Too many authentication attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }
}
