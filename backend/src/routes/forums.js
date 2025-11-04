const express = require('express');
const router = express.Router();
const { authenticateToken, requireUserType } = require('../middleware/auth');
const forumsController = require('../controllers/forumsController');

router.use(authenticateToken);

router.get('/categories', forumsController.getCategories);
router.post('/categories', requireUserType(['researcher']), forumsController.createCategory);
router.get('/posts', forumsController.getPosts);
router.post('/posts', forumsController.createPost);
router.get('/posts/:id', forumsController.getPost);
router.post('/posts/:id/replies', authenticateToken, forumsController.createReply);

module.exports = router;

