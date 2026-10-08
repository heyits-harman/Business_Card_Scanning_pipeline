const sharp = require('sharp');

class ImagePreprocessor {
  async optimizeForOCR(imageBuffer) {
    return await sharp(imageBuffer)
      // 1. Resize to a higher DPI equivalent (upscale small card text)
      .resize({ width: 1800, fit: 'inside', withoutEnlargement: false })
      // 2. Convert to grayscale to eliminate background colors
      .grayscale()
      // 3. Normalize contrast (stretch contrast to full dynamic range)
      .normalize()
      // 4. Sharpen text edges
      .sharpen()
      // 5. Output crisp PNG buffer
      .toBuffer();
  }
}

module.exports = new ImagePreprocessor();