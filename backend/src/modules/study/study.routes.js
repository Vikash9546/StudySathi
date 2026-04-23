const { Router } = require('express');
const multer = require('multer');
const studyController = require('./study.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// Store files in memory (we'll stream to Firebase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();

// All study routes require authentication
router.use(authMiddleware);

router.post('/upload', upload.single('file'), studyController.upload.bind(studyController));
router.get('/notes', studyController.getNotes.bind(studyController));
router.get('/notes/:id', studyController.getNoteById.bind(studyController));
router.put('/notes/:id', studyController.updateNote.bind(studyController));
router.delete('/notes/:id', studyController.deleteNote.bind(studyController));

module.exports = router;
