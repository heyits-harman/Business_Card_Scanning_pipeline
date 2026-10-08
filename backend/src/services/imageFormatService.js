const heicConvert = require('heic-convert');

class ImageFormatService {
  /**
   * Convert HEIC/HEIF buffers to JPEG; leave standard formats untouched.
   */
  async normalizeImageBuffer(file) {
    const isHeic = 
      file.mimetype === 'image/heic' || 
      file.mimetype === 'image/heif' || 
      (file.originalname && /\.heic$/i.test(file.originalname));

    if (isHeic) {
      console.log('[ImageFormatService] Converting HEIC image to JPEG...');
      const outputBuffer = await heicConvert({
        buffer: file.buffer,
        format: 'JPEG',
        quality: 0.95
      });

      return {
        buffer: outputBuffer,
        mimetype: 'image/jpeg'
      };
    }

    return {
      buffer: file.buffer,
      mimetype: file.mimetype
    };
  }
}

module.exports = new ImageFormatService();