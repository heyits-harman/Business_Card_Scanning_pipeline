const Tesseract = require('tesseract.js');

class OCRService {
  async processCardImages(files) {
    const worker = await Tesseract.createWorker('eng');
    let combinedTextArray = [];
    let combinedWordsArray = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ret = await worker.recognize(file.buffer);

        combinedTextArray.push(`--- Side ${i + 1} ---\n` + ret.data.text);
        combinedWordsArray = combinedWordsArray.concat(ret.data.words);
      }
    } finally {
      await worker.terminate(); // Ensure worker cleanup even if errors occur
    }

    return {
      mergedText: combinedTextArray.join('\n'),
      allWords: combinedWordsArray
    };
  }
}

module.exports = new OCRService();