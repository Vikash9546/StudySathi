import { redis } from '../../config/redis.js';
import crypto from 'crypto';

export class PromptCache {
  getCacheKey(prompt, options = {}) {
    const hash = crypto.createHash('sha256').update(`${prompt}_${JSON.stringify(options)}`).digest('hex');
    return `prompt-cache:${hash}`;
  }

  async get(prompt, options = {}) {
    const key = this.getCacheKey(prompt, options);
    try {
      const val = await redis.get(key);
      if (val) return JSON.parse(val);
    } catch (err) {
      console.warn('Failed to read from prompt cache:', err.message);
    }
    return null;
  }

  async set(prompt, data, options = {}, ttl = 86400) {
    const key = this.getCacheKey(prompt, options);
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to write to prompt cache:', err.message);
    }
  }
}

export const promptCache = new PromptCache();
