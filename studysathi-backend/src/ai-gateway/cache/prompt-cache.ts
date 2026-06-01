import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { REDIS_CLIENT } from '../../config/redis.module';

@Injectable()
export class PromptCacheService {
  private readonly logger = new Logger(PromptCacheService.name);
  private readonly TTL = 60 * 60 * 24; // 24 hours

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  private hashKey(prompt: string): string {
    return `ai:cache:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
  }

  async get(prompt: string): Promise<string | null> {
    const key = this.hashKey(prompt);
    const cached = await this.redis.get(key);
    if (cached) {
      this.logger.debug('Cache HIT');
    }
    return cached;
  }

  async set(prompt: string, response: string): Promise<void> {
    const key = this.hashKey(prompt);
    await this.redis.setex(key, this.TTL, response);
  }

  async invalidate(prompt: string): Promise<void> {
    const key = this.hashKey(prompt);
    await this.redis.del(key);
  }
}
