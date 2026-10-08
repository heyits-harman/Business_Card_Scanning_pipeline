const axios = require('axios');

class LLMService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash-lite:generateContent';
  }

  async parseCardWithVision(files) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is missing from environment variables.');
    }

    console.log('[LLMService] Executing Vision LLM fallback request via Axios...');

    // Format file buffers as inline base64 image objects
    const imageParts = files.map(file => ({
      inline_data: {
        mime_type: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }));

    const promptText = `
      Examine the provided business card image(s) (front/back).
      Extract all contact details into this exact JSON format:
      {
        "contact": {
          "full_name": string or null,
          "company_name": string or null,
          "email": string or null,
          "phone": string or null,
          "website": string or null,
          "address": string or null
        }
      }
      
      Rules:
      1. Clean up stray symbols or typos.
      2. If front and back images are provided, merge details into a single contact object.
      3. Set any field absent on the card to null.
      4. Ensure company name and person full name are strictly distinguished.
    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            ...imageParts
          ]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1
      }
    };

    try {
      const response = await axios.post(this.endpoint, requestBody, {
        params: {
          key: this.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10-second timeout to prevent hanging requests
      });

      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini API returned an unexpected or empty payload structure.');
      }

      return JSON.parse(rawText);

    } catch (error) {
      if (error.response) {
        // HTTP response error from Google API
        console.error('[LLMService Error Response]:', error.response.status, error.response.data);
        throw new Error(`Gemini API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Request made but no response received
        console.error('[LLMService Network Error]: No response received from Gemini endpoint.');
        throw new Error('Gemini API failed to respond. Please check server network connectivity.');
      } else {
        // Syntax or execution error
        console.error('[LLMService Runtime Error]:', error.message);
        throw error;
      }
    }
  }
}

module.exports = new LLMService();