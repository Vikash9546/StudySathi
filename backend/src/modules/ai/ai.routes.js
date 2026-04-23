const { Router } = require('express');
const aiController = require('./ai.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { aiLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();

// All AI routes require authentication + stricter rate limiting
router.use(authMiddleware);
router.use(aiLimiter);

router.post('/summarize', aiController.summarize.bind(aiController));
router.post('/flashcards', aiController.flashcards.bind(aiController));
router.post('/quiz', aiController.quiz.bind(aiController));
router.get('/result/:id', aiController.getResult.bind(aiController));
router.get('/results/note/:noteId', aiController.getResultsByNote.bind(aiController));

module.exports = router;
