import { Router } from 'express';
import { communityService } from '../../services/community.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';

const router = Router();

// Create a new post
router.post('/posts', requireAuth, async (req, res, next) => {
  try {
    const { title, content, topics } = req.body;
    const result = await communityService.createPost(req.currentUser.id, title, content, topics);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get all posts (optional topic query parameter)
router.get('/posts', requireAuth, async (req, res, next) => {
  try {
    const { topic } = req.query;
    const result = await communityService.getPosts(topic);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get post by ID
router.get('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await communityService.getPostById(req.params.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Add an answer to a post
router.post('/posts/:id/answers', requireAuth, async (req, res, next) => {
  try {
    const { content } = req.body;
    const result = await communityService.createAnswer(req.currentUser.id, req.params.id, content);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Accept an answer
router.post('/answers/:answerId/accept', requireAuth, async (req, res, next) => {
  try {
    const result = await communityService.acceptAnswer(req.currentUser.id, req.params.answerId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Vote on a post
router.post('/posts/:id/vote', requireAuth, async (req, res, next) => {
  try {
    const { value } = req.body; // 1 or -1
    const result = await communityService.votePost(req.currentUser.id, req.params.id, value);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
