const { Router } = require('express');
const progressController = require('./progress.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', progressController.getProgress.bind(progressController));
router.post('/update', progressController.updateProgress.bind(progressController));

module.exports = router;
