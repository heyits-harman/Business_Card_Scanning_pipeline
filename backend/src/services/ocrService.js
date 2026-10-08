const Tesseract = require('tesseract.js');
const imagePreprocessor = require('./imagePreProcessor');

class OCRService {
  async processCardImages(files) {
    const worker = await Tesseract.createWorker('eng');

    // Tune Tesseract parameters specifically for sparse document layout
    await worker.setParameters({
      tessedit_pageseg_mode: '3', // Fully automatic page segmentation without OSD error
      preserve_interword_spaces: '1'
    });

    let combinedTextArray = [];
    let combinedWordsArray = [];

    try {
      for (let i = 0; i < files.length; i++) {
        // Step 1: Preprocess image with sharp
        const processedBuffer = await imagePreprocessor.optimizeForOCR(files[i].buffer);

        // Step 2: Run Tesseract on preprocessed buffer
        const ret = await worker.recognize(processedBuffer);

        combinedTextArray.push(`--- Side ${i + 1} ---\n` + ret.data.text);
        combinedWordsArray = combinedWordsArray.concat(ret.data.words || []);
      }
    } finally {
      await worker.terminate();
    }

    return {
      mergedText: combinedTextArray.join('\n'),
      allWords: combinedWordsArray
    };
  }
}

module.exports = new OCRService();