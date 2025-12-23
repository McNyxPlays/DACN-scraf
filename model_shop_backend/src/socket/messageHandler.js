// src/socket/messageHandler.js
module.exports = (io, socket) => {
  const { logError } = require('../config/functions');
  const MessageModel = require('../models/messageModel');

  // Join room cho user
  socket.on('join', (user_id) => {
    socket.join(`user_${user_id}`);
  });

  // Gửi message real-time
  socket.on('send_message', async ({ recipient_id, content, media_url }) => {
    const sender_id = socket.user_id;  // Giả định middleware auth socket set socket.user_id
    if (!sender_id) return;

    try {
      let conversation_id = await MessageModel.createConversation(sender_id, recipient_id);
      const message_id = await MessageModel.addMessage(conversation_id, sender_id, content, media_url);

      const message = {
        message_id,
        conversation_id,
        sender_id,
        content,
        media_url,
        created_at: new Date().toISOString()
      };

      io.to(`user_${recipient_id}`).emit('new_message', message);
      socket.emit('message_sent', message);  // Xác nhận cho sender
    } catch (error) {
      await logError(`Socket send_message error: ${error.message}`);
    }
  });
};