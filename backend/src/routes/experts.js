const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const expertsController = require('../controllers/expertsController');

router.use(authenticateToken);

router.get('/search', expertsController.searchExperts);
router.get('/recommended', expertsController.getRecommended);
router.get('/:id', expertsController.getExpert);
router.post('/:id/follow', expertsController.followExpert);
router.post('/:id/meeting-request', expertsController.requestMeeting);

// Meeting request management (for researchers)
const { requireUserType } = require('../middleware/auth');
router.get('/meetings', authenticateToken, requireUserType(['researcher']), expertsController.getMeetingRequests);
router.post('/meetings/:id/respond', authenticateToken, requireUserType(['researcher']), expertsController.respondToMeetingRequest);

module.exports = router;

