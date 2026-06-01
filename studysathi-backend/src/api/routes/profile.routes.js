import { Router } from 'express';
import { profileService } from '../../services/profile.service.js';
import { studyPlannerService } from '../../services/study-planner.service.js';
import { friendService } from '../../services/friend.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';

const router = Router();

// Get profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.currentUser.id);
    res.json(successResponse(profile));
  } catch (err) {
    next(err);
  }
});

// Update profile
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const updated = await profileService.updateProfile(req.currentUser.id, req.body);
    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// Submit onboarding
router.post('/onboarding', requireAuth, async (req, res, next) => {
  try {
    const { examGoal, subjects, dailyTargetMins, examDate } = req.body;
    const result = await profileService.submitOnboarding(req.currentUser.id, {
      examGoal,
      subjects,
      dailyTargetMins,
      examDate,
    });
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get current weekly study plan
router.get('/plan', requireAuth, async (req, res, next) => {
  try {
    const plan = await studyPlannerService.getCurrentPlan(req.currentUser.id);
    res.json(successResponse(plan));
  } catch (err) {
    next(err);
  }
});

// Generate new weekly study plan
router.post('/plan', requireAuth, async (req, res, next) => {
  try {
    const plan = await studyPlannerService.generateWeeklyPlan(req.currentUser.id);
    res.json(successResponse(plan));
  } catch (err) {
    next(err);
  }
});

// Complete a study plan task
router.patch('/plan/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const task = await studyPlannerService.completeTask(req.currentUser.id, req.params.taskId);
    res.json(successResponse(task));
  } catch (err) {
    next(err);
  }
});

// Send a friend request
router.post('/friends/request', requireAuth, async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await friendService.sendFriendRequest(req.currentUser.id, email);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Respond to friend request (ACCEPTED/REJECTED)
router.post('/friends/request/:requestId', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await friendService.respondToFriendRequest(req.currentUser.id, req.params.requestId, status);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get user friends list
router.get('/friends', requireAuth, async (req, res, next) => {
  try {
    const result = await friendService.getFriends(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Follow a user
router.post('/follow/:userId', requireAuth, async (req, res, next) => {
  try {
    const result = await friendService.followUser(req.currentUser.id, req.params.userId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Unfollow a user
router.delete('/follow/:userId', requireAuth, async (req, res, next) => {
  try {
    const result = await friendService.unfollowUser(req.currentUser.id, req.params.userId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
