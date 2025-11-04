const express = require('express');
const router = express.Router();
const { authenticateToken, requireUserType } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

router.use(authenticateToken);
router.use(requireUserType(['patient']));

router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);
router.get('/dashboard', patientController.getDashboard);

module.exports = router;

