const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const trialsController = require('../controllers/trialsController');

router.use(authenticateToken);

// Specific routes first (before parameterized routes)
router.get('/search', trialsController.searchTrials);
router.post('/', trialsController.createTrial);
router.post('/:id/generate-summary', trialsController.generateTrialSummary);

// Parameterized routes last
router.get('/:id', trialsController.getTrial);
router.put('/:id', trialsController.updateTrial);

module.exports = router;

