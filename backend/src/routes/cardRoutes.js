const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const cardController = require('../controllers/cardController');

// POST /api/cards/scan - Accept up to 2 image files under key 'card_images'
router.post('/scan', upload.array('card_images', 2), (req, res) => {
  cardController.scanCard(req, res);
});

module.exports = router;