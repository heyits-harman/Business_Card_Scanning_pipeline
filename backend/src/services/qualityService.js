const sharp = require('sharp');

class QualityService {

   //Pre-OCR Check: Evaluate image sharpness and dimensions using sharp
  ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  async validateAndPrepareImage(file) {
    // 1. Format Check
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        isValid: false,
        status: 'INVALID_FORMAT',
        reason: `Unsupported format (${file.mimetype}). Please upload JPG, PNG, WEBP, or HEIC.`
      };
    }

    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      // 2. Minimum Dimension / Resolution Check
      if (metadata.width < 400 || metadata.height < 400) {
        return {
          isValid: false,
          status: 'LOW_RESOLUTION',
          reason: `Image resolution is too low (${metadata.width}x${metadata.height}). Minimum required is 400x400.`
        };
      }

      // Extract raw grayscale pixel values to analyze lighting and contrast
      const { data } = await image.greyscale().raw().toBuffer({ resolveWithObject: true });

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const meanBrightness = sum / data.length; // Average brightness (0 - 255)

      let varianceSum = 0;
      for (let i = 0; i < data.length; i++) {
        varianceSum += Math.pow(data[i] - meanBrightness, 2);
      }
      const stdDev = Math.sqrt(varianceSum / data.length); // Contrast metric

      // 3. Darkness Check (Mean brightness below 30 out of 255)
      if (meanBrightness < 30) {
        return {
          isValid: false,
          status: 'TOO_DARK',
          reason: 'Image is too dark. Please take a photo with better lighting.'
        };
      }

      // 4. Overexposure Check (Mean brightness above 230 out of 255)
      if (meanBrightness > 230) {
        return {
          isValid: false,
          status: 'OVEREXPOSED',
          reason: 'Image has too much glare or light. Avoid direct flash.'
        };
      }

      // 5. Low Contrast Check
      if (stdDev < 20) {
        return {
          isValid: false,
          status: 'LOW_CONTRAST',
          reason: 'Image has very low contrast between text and background.'
        };
      }

      // All pre-checks passed!
      return {
        isValid: true,
        status: 'OK',
        reason: 'Image quality check passed.'
      };

    } catch (error) {
      console.error('[QualityService Pre-check Error]:', error);
      return {
        isValid: false,
        status: 'CORRUPTED_FILE',
        reason: 'Could not process or read the image file. File may be corrupted.'
      };
    }
  }

  //Post-OCR Check: Validate extracted JSON against rules before deciding to accept or route to LLM
  validateOcrResult(structuredData) {
    const { contact, meta } = structuredData;
    const rawText = meta.raw_text || '';

    // Rule 1: CRITICAL FIELD - Company Name must NOT be null or empty
    if (!contact.company_name || contact.company_name.trim().length < 2) {
      return { isValid: false, reason: 'Missing company name' };
    }

    // Rule 2: CRITICAL FIELD - Full Name must NOT be null or empty
    if (!contact.full_name || contact.full_name.trim().length < 3) {
      return { isValid: false, reason: 'Missing full name' };
    }

    // Rule 3: Business/Trade terms should NEVER be classified as a Person's Name
    const businessWordsInName = /\b(decorators|caterers|exports|textiles|traders|pvt|ltd|inc|corp|services|solutions|industries|technologies|enterprises|building|road|sales|manager|director)\b/i;
    if (businessWordsInName.test(contact.full_name)) {
      return { isValid: false, reason: `Full name contains business/title term: "${contact.full_name}"` };
    }

    // Rule 4: Primary contact handles must exist (Email or Phone)
    if (!contact.email && !contact.phone) {
      return { isValid: false, reason: 'Missing both email and phone number' };
    }

    // Rule 5: Gibberish/Noise Check
    const specialChars = (rawText.match(/[^a-zA-Z0-9\s@\.\+\-]/g) || []).length;
    const gibberishRatio = specialChars / Math.max(rawText.length, 1);
    if (gibberishRatio > 0.18) {
      return { isValid: false, reason: 'High OCR noise ratio' };
    }

    return { isValid: true, reason: 'OCR output passed validation' };
  }
}

module.exports = new QualityService();