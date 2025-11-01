const fs = require('fs').promises;
const path = require('path');

const sanitizeInput = (data) => {
  if (typeof data !== 'string') return data;
  return data.trim().replace(/<\/?[^>]+(>|$)/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const logError = async (message, query = null, params = null) => {
  const logFile = path.join(__dirname, '../logs/error_log.txt');
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  if (query) {
    logMessage += `\nQuery: ${query}`;
    if (params) {
      logMessage += `\nParams: ${JSON.stringify(params)}`;
    }
  }
  logMessage += '\n';
  await fs.appendFile(logFile, logMessage);
};

module.exports = { sanitizeInput, logError };