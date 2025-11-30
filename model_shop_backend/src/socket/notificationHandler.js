// src/socket/notificationHandler.js
const setupNotificationSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected for notifications:', socket.id);

    socket.on('join-notification-room', ({ room }) => {
      socket.join(room);
      console.log(`User joined notification room: ${room}`);
    });

    socket.on('leave-notification-room', ({ room }) => {
      socket.leave(room);
      console.log(`User left notification room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from notifications:', socket.id);
    });
  });
};

module.exports = { setupNotificationSocket };