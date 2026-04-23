const { Router } = require('express');
const studyController = require('./study.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { upload, ensureDbReady } = require('../../config/storage');

const router = Router();

// All study routes require authentication
router.use(authMiddleware);

// Use GridFS storage for uploads after checking if DB is ready
router.post('/upload', ensureDbReady, upload.single('note'), studyController.upload.bind(studyController));

router.get('/notes', studyController.getNotes.bind(studyController));
router.get('/notes/:id', studyController.getNoteById.bind(studyController));
router.put('/notes/:id', studyController.updateNote.bind(studyController));
router.delete('/notes/:id', studyController.deleteNote.bind(studyController));

module.exports = router;
