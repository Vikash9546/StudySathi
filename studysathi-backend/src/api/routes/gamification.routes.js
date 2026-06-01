import { Router } from 'express';
import { gamificationService } from '../../services/gamification.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';

const router = Router();

// Get gamification stats for user
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await gamificationService.getStats(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get leaderboard
router.get('/leaderboard', requireAuth, async (req, res, next) => {
  try {
    const { type } = req.query; // e.g. weekly or monthly or all-time
    const result = await gamificationService.getLeaderboard(req.currentUser.id, type);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
