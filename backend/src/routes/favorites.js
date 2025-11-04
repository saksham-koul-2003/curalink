const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const favoritesController = require('../controllers/favoritesController');

router.use(authenticateToken);

router.get('/', favoritesController.getFavorites);
router.post('/', favoritesController.addFavorite);
router.delete('/:item_type/:item_id', favoritesController.removeFavorite);

module.exports = router;

