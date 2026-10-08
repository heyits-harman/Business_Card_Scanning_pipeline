class ParserService {
  extractRegexFields(rawText) {
    if (!rawText) return { email: null, website: null, phone: null };

    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/i;
    const websiteRegex = /(?:https?:\/\/|www\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;
    const phoneRegex = /(?:\+?\d{1,3}[\s\.-]?)?\(?\d{2,5}\)?[\s\.-]?\d{3,5}[\s\.-]?\d{3,5}/g;

    const emailMatch = rawText.match(emailRegex);
    let websiteMatch = rawText.match(websiteRegex);

    if (websiteMatch && /gmail|yahoo|hotmail|outlook/i.test(websiteMatch[0])) {
      websiteMatch = null;
    }

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

  // Helper to check if a line is a contact detail header (E email, W website, M mobile, T tel)
  isContactLine(line) {
    const lower = line.toLowerCase();
    return (
      lower.includes('@') ||
      lower.includes('www.') ||
      lower.includes('http') ||
      /^[emwtf]\s*[\+\d]/i.test(line) || // Lines like "M +91...", "E test@..."
      /^(fax|telephone|phone|mobile|tel)\s*:/i.test(line)
    );
  }

  extractAddress(lines) {
    let addressLines = [];
    const addressIndicators = /\b(shop|building|bldg|tower|road|rd|street|st|sector|noida|mumbai|delhi|surat|pune|\d{6})\b/i;

    for (const line of lines) {
      if (this.isContactLine(line)) continue;

      if (addressIndicators.test(line)) {
        const cleaned = line.replace(/^[#;\s\\/—\-]+/, '').trim();
        if (cleaned.length > 5) {
          addressLines.push(cleaned);
        }
      }
    }

    return addressLines.length > 0 ? addressLines.join(', ') : null;
  }

  parseAndAssemble(mergedText, allWords = []) {
    const regexData = this.extractRegexFields(mergedText);

    // Clean OCR lines
    const cleanLines = mergedText
      .split('\n')
      .map(line => line.replace(/[^a-zA-Z0-9\s@\.\+\-,\(\)\:]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 2 && !line.startsWith('Side'));

    const address = this.extractAddress(cleanLines);

    // Dynamic Full Name Identification
    let fullName = null;
    const businessTerms = /\b(pvt|ltd|inc|corp|services|enterprises|building|tower|sector|sales|manager|director|deputy)\b/i;

    for (const line of cleanLines) {
      if (this.isContactLine(line) || /\d/.test(line) || businessTerms.test(line)) continue;
      if (address && address.includes(line)) continue;

      const words = line.split(' ');
      if (words.length >= 2 && words.length <= 4) {
        fullName = line;
        break;
      }
    }

    // Dynamic Company Name Identification
    let companyName = null;
    const companyKeywords = /\b(pvt|ltd|private|limited|inc|corp|corporation|industries|technologies|digital|exports|textiles)\b/i;

    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i];

      // Skip contact lines or full name line when detecting company
      if (this.isContactLine(line) || line === fullName) continue;

      if (companyKeywords.test(line)) {
        // Check if preceding line is a brand name prefix, making sure it's NOT a contact handle or full name
        if (i > 0 && !this.isContactLine(cleanLines[i - 1]) && cleanLines[i - 1] !== fullName && !/\d/.test(cleanLines[i - 1])) {
          companyName = `${cleanLines[i - 1]} ${line}`;
        } else {
          companyName = line;
        }
        break;
      }
    }

    // Fallback company name from domain if still null
    if (!companyName && regexData.email) {
      const domain = regexData.email.split('@')[1]?.split('.')[0];
      if (domain && !['gmail', 'yahoo', 'hotmail', 'outlook'].includes(domain.toLowerCase())) {
        companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    }

    return {
      contact: {
        full_name: fullName,
        company_name: companyName,
        email: regexData.email,
        phone: regexData.phone,
        website: regexData.website,
        address: address
      },
      meta: {
        raw_text: mergedText
      }
    };
  }
}

module.exports = new ParserService();