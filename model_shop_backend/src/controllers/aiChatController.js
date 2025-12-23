// src/controllers/aiChatController.js
const axios = require('axios');
const { logError } = require('../config/functions');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const chatWithAI = async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'Valid message is required' });
  }

  try {
    // Clean history: remove empty/invalid messages
    const cleanedHistory = history
      .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string' && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role.toLowerCase(), // Ensure lowercase
        content: msg.content.trim()
      }));

    const payload = {
      model: 'llama-3.1-8b-instant', // Double-check this model exists on Groq
      messages: [
        {
          role: 'system',
          content: `
You are Grok, an AI specialized in static models (model kits, Gundam, figures, scale models, etc.).
Respond in Vietnamese, friendly, enthusiastic, and professional.
Provide accurate information about products, painting techniques, decal application, assembly, brands (Bandai, Tamiya, Meng, Trumpeter, etc.).
If asked about specific products, suggest purchase links or references on the website.
Do not respond to topics unrelated to models.
          `
        },
        ...cleanedHistory,
        { role: 'user', content: message.trim() }
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    };

    console.log('Groq request payload:', JSON.stringify(payload, null, 2)); // Debug

    const response = await axios.post(GROQ_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30s timeout
    });

    const aiReply = response.data.choices[0].message.content;
    res.json({ status: 'success', reply: aiReply });
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq API error:', errorMsg);
    await logError(`AI Chat error: ${errorMsg}`);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get AI response',
      details: errorMsg
    });
  }
};

module.exports = { chatWithAI };