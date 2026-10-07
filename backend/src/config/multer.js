const multer = require('multer');

// Store files in memory buffer for instant stream processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit per image
  }
});

module.exports = upload;