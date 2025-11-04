const express = require('express');
const router = express.Router();
const { authenticateToken, requireUserType } = require('../middleware/auth');
const researcherController = require('../controllers/researcherController');

router.use(authenticateToken);
router.use(requireUserType(['researcher']));

router.get('/profile', researcherController.getProfile);
router.put('/profile', researcherController.updateProfile);
router.get('/dashboard', researcherController.getDashboard);
router.get('/collaborators', researcherController.searchCollaborators);
router.get('/collaborators/:id/profile', researcherController.getCollaboratorProfile);
router.post('/collaborators/:id/connect', researcherController.requestConnection);
router.get('/connections', researcherController.getConnectionRequests);
router.post('/connections/:id/respond', researcherController.respondToConnectionRequest);

module.exports = router;

