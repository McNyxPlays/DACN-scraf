// model_shop_backend/src/utils/socket.js
const setupSocket = (io) => {
  io.on('connection', (socket) => {
    const req = socket.request;
    const userId = req.session.user_id;

    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} connected via Socket.IO`);
    }

    socket.on('disconnect', () => {
      console.log(`User ${userId || 'unknown'} disconnected`);
    });
  });
};

module.exports = { setupSocket };