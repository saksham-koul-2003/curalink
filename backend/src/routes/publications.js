const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const publicationsController = require('../controllers/publicationsController');

// Specific routes must come before parameterized routes (/:id)
// Search doesn't require auth
router.get('/search', publicationsController.searchPublications);

// Recommended and ORCID fetch require auth
router.get('/recommended', authenticateToken, publicationsController.getRecommended);
router.post('/orcid/fetch', authenticateToken, publicationsController.fetchORCIDWorks);

// Get specific publication by ID (no auth required)
router.get('/:id', publicationsController.getPublication);

module.exports = router;

