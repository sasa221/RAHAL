import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";
import { loadApiConfig } from "../config";

type RateBucket = { count: number; resetsAt: number };

@Injectable()
export class AuthRateLimitService implements OnModuleDestroy {
  private readonly config = loadApiConfig();
  private readonly buckets = new Map<string, RateBucket>();
  private redis?: RedisClientType;

  async assertAllowed(key: string, limit: number, windowMs: number) {
    if (this.config.redisUrl) {
      await this.assertRedisAllowed(key, limit, windowMs);
      return;
    }
    if (this.config.production) {
      throw new ServiceUnavailableException("Authentication protection is unavailable.");
    }

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

  async onModuleDestroy() {
    if (this.redis?.isOpen) await this.redis.quit().catch(() => undefined);
  }

  async readiness() {
    if (!this.config.redisUrl) return;
    try {
      await (await this.client()).ping();
    } catch {
      throw new ServiceUnavailableException("Authentication protection is unavailable.");
    }
  }

  private async assertRedisAllowed(key: string, limit: number, windowMs: number) {
    try {
      const redis = await this.client();
      const result = (await redis.eval(
        [
          "local count = redis.call('INCR', KEYS[1])",
          "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
          "return count",
        ].join("\n"),
        {
          keys: [`rahal:auth-limit:${key}`],
          arguments: [String(windowMs)],
        },
      )) as number;
      if (result > limit) this.reject();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (this.config.production) {
        throw new ServiceUnavailableException("Authentication protection is unavailable.");
      }
      this.assertLocalAllowed(key, limit, windowMs);
    }
  }

  private async client() {
    this.redis ??= createClient({
      url: this.config.redisUrl,
      socket: { connectTimeout: 3_000, reconnectStrategy: false },
    });
    if (!this.redis.isOpen) await this.redis.connect();
    return this.redis;
  }

  private assertLocalAllowed(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetsAt <= now) {
      this.buckets.set(key, { count: 1, resetsAt: now + windowMs });
      return;
    }
    if (current.count >= limit) this.reject();
    current.count += 1;
  }

  private reject(): never {
    throw new HttpException(
      "Too many authentication attempts. Try again later.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
