const ocrService = require('../services/ocrService');
const parserService = require('../services/parserService');
const qualityService = require('../services/qualityService');
const imageFormatService = require('../services/imageFormatService');
const llmService = require('../services/llmService');

class CardController {
  async scanCard(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Please upload at least one card image.' });
      }

      console.log(`[CardController] Received ${req.files.length} card image(s)...`);

      // STEP 0: HEIC/HEIF to JPEG Normalization
      for (let i = 0; i < req.files.length; i++) {
        const normalized = await imageFormatService.normalizeImageBuffer(req.files[i]);
        req.files[i].buffer = normalized.buffer;
        req.files[i].mimetype = normalized.mimetype;
      }

      // STEP 1: Pre-OCR Format & Quality Check (Resolution, Darkness, Contrast)
      for (let i = 0; i < req.files.length; i++) {
        const preCheck = await qualityService.validateAndPrepareImage(req.files[i]);
        if (!preCheck.isValid) {
          return res.status(400).json({
            success: false,
            error_code: preCheck.status,
            error: `Image ${i + 1} failed quality check: ${preCheck.reason}`
          });
        }
      }

      // STEP 2: Local Tesseract OCR Execution
      const { mergedText, allWords } = await ocrService.processCardImages(req.files);

      // STEP 3: Rule & Spatial Parser Assembly
      const structuredData = parserService.parseAndAssemble(mergedText, allWords);

      // STEP 4: Post-OCR Output Validation Check
      const validationCheck = qualityService.validateOcrResult(structuredData);

      if (validationCheck.isValid) {
        console.log('[CardController] Local OCR passed validation!');
        return res.status(200).json({
          success: true,
          processed_by: 'Local_OCR',
          data: structuredData
        });
      }

      // STEP 5: Gemini Fallback when Local OCR Validation Fails
      console.log(`[CardController] Local OCR validation failed (${validationCheck.reason}). Executing Gemini Fallback...`);

      const llmResult = await llmService.parseCardWithVision(req.files);

      return res.status(200).json({
        success: true,
        processed_by: 'Gemini_Vision_LLM',
        fallback_reason: validationCheck.reason,
        data: llmResult
      });

    } catch (error) {
      console.error('[CardController Error]:', error);
      return res.status(500).json({ success: false, error: 'Failed to process card image(s).' });
    }
  }
}

module.exports = new CardController();