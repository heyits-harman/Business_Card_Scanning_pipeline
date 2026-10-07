const ocrService = require('../services/ocrService');
const parserService = require('../services/parserService');

class CardController {
  async scanCard(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Please upload at least one card image.' });
      }

      console.log(`[CardController] Received ${req.files.length} card image(s) for processing.`);

      // 1. Run OCR across all uploaded sides
      const { mergedText, allWords } = await ocrService.processCardImages(req.files);

      // 2. Parse extracted data using A, B, C strategy
      const structuredData = parserService.parseAndAssemble(mergedText, allWords);

      return res.status(200).json({
        success: true,
        sides_processed: req.files.length,
        data: structuredData
      });

    } catch (error) {
      console.error('[CardController Error]:', error);
      return res.status(500).json({ success: false, error: 'Failed to process card image(s).' });
    }
  }
}

module.exports = new CardController();