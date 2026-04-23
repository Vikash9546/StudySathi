const Groq = require('groq-sdk');
const logger = require('../utils/logger');

let groqClient = null;

/**
 * Lazy-initialise and return the Groq client.
 */
const getGroqClient = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    logger.info('Groq client initialised');
  }
  return groqClient;
};

module.exports = { getGroqClient };
