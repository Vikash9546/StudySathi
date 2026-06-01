import { redis } from '../../config/redis.js';
import { ForbiddenError, AppError } from '../../common/errors.js';

export function aiRateLimiter(maxFreePerHour = 20, maxProPerHour = 200) {
  return async (req, res, next) => {
    // If not authenticated, we can rate limit by IP
    const identifier = req.currentUser ? req.currentUser.id : req.ip;
    const plan = req.currentUser ? req.currentUser.plan : 'FREE';
    const limit = plan === 'PRO' ? maxProPerHour : maxFreePerHour;

    const key = `ratelimit:ai:${identifier}`;

    try {
      const current = await redis.get(key);

      if (current && parseInt(current, 10) >= limit) {
        const ttl = await redis.ttl(key);
        return next(
          new AppError(
            `AI rate limit exceeded. You have used all your ${limit} requests. Please retry in ${Math.ceil(
              ttl / 60
            )} minutes. Upgrade to PRO for higher limits.`,
            429
          )
        );
      }

      // Increment and set expiry if first request
      const multi = redis.multi();
      multi.incr(key);
      if (!current) {
        multi.expire(key, 3600); // 1 hour window
      }
      await multi.exec();

      next();
    } catch (err) {
      // In case Redis is down, log it but don't block user
      console.error('Rate limit error, bypassing check:', err);
      next();
    }
  };
}
