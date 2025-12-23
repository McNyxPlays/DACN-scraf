// src/controllers/messageController.js
const db = require('../config/db');
const MessageModel = require('../models/messageModel');
const { sanitizeInput, logError } = require('../config/functions');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer config for media upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/messages');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.mp4'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB max
}).single('media');

// GET /messages - Lấy danh sách conversations
const getConversations = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  try {
    const conversations = await MessageModel.getConversationsForUser(req.session.user_id);
    res.json({ status: 'success', data: conversations });
  } catch (error) {
    await logError(`getConversations error: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to fetch conversations' });
  }
};

// GET /messages?conversation_id=... - Lấy messages trong conversation
const getMessages = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const conversation_id = parseInt(req.query.conversation_id);
  if (!conversation_id) return res.status(400).json({ status: 'error', message: 'Invalid conversation ID' });

  try {
    const messages = await MessageModel.getMessagesInConversation(conversation_id, req.session.user_id);
    res.json({ status: 'success', data: messages });
  } catch (error) {
    await logError(`getMessages error: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to fetch messages' });
  }
};

// POST /messages - Gửi message mới (HTTP fallback nếu cần, nhưng ưu tiên socket)
const sendMessage = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });

    const { recipient_id, content } = req.body;
    const media_url = req.file ? `/uploads/messages/${req.file.filename}` : null;

    if (!recipient_id || (!content && !media_url)) {
      return res.status(400).json({ status: 'error', message: 'Recipient ID and content/media required' });
    }

    try {
      let conversation_id = await MessageModel.createConversation(req.session.user_id, parseInt(recipient_id));
      const message_id = await MessageModel.addMessage(conversation_id, req.session.user_id, sanitizeInput(content), media_url);

      // Emit socket event
      const io = req.app.get('io');  // Giả định io được set ở app
      const message = {
        message_id,
        conversation_id,
        sender_id: req.session.user_id,
        content,
        media_url,
        created_at: new Date().toISOString()
      };
      io.to(`user_${recipient_id}`).emit('new_message', message);

      res.json({ status: 'success', message_id });
    } catch (error) {
      await logError(`sendMessage error: ${error.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to send message' });
    }
  });
};

module.exports = { getConversations, getMessages, sendMessage };