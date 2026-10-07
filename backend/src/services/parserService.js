const nlp = require('compromise');

class ParserService {
  // Approach A: Regex pattern matching for deterministic fields
  extractRegexFields(rawText) {
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/i;
    const phoneRegex = /(?:\+?\d{1,3}[\s\.-]?)?\(?\d{2,5}\)?[\s\.-]?\d{3,5}[\s\.-]?\d{3,5}/g;
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;

    const emailMatch = rawText.match(emailRegex);
    const websiteMatch = rawText.match(websiteRegex);

    let phoneMatches = rawText.match(phoneRegex) || [];
    phoneMatches = phoneMatches
      .map(p => p.trim())
      .filter(p => p.replace(/\D/g, '').length >= 8);

    return {
      email: emailMatch ? emailMatch[0] : null,
      website: websiteMatch ? websiteMatch[0] : null,
      phone: phoneMatches.length > 0 ? phoneMatches[0] : null
    };
  }

  // Approach C: Compromise NLP for Person Names and Organizations
  extractNLPFields(rawText) {
    const doc = nlp(rawText);
    return {
      candidateNames: doc.people().out('array'),
      candidateOrgs: doc.organizations().out('array')
    };
  }

  // Approach B: Spatial Layout & Final Schema Assembly
  parseAndAssemble(mergedText, allWords) {
    const regexData = this.extractRegexFields(mergedText);
    const nlpData = this.extractNLPFields(mergedText);

    let maxBboxHeight = 0;
    let dominantText = '';

    allWords.forEach(word => {
      const height = word.bbox.y1 - word.bbox.y0;
      if (height > maxBboxHeight && word.text.length > 2) {
        maxBboxHeight = height;
        dominantText = word.text;
      }
    });

    const fullName = nlpData.candidateNames.length > 0 ? nlpData.candidateNames[0] : null;

    let companyName = nlpData.candidateOrgs.length > 0 ? nlpData.candidateOrgs[0] : null;

    if (!companyName && regexData.email) {
      const domain = regexData.email.split('@')[1]?.split('.')[0];
      if (domain && !['gmail', 'yahoo', 'hotmail', 'outlook'].includes(domain)) {
        companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    }

    return {
      contact: {
        full_name: fullName,
        company_name: companyName,
        email: regexData.email,
        phone: regexData.phone,
        website: regexData.website
      },
      meta: {
        raw_text: mergedText,
        dominant_font_word: dominantText
      }
    };
  }
}

module.exports = new ParserService();