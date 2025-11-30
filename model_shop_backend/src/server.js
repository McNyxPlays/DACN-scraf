// src/server.js
const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

// Gắn io vào app để dùng ở mọi nơi (controllers/utils)
app.set('io', io);

// Khởi tạo notification handler
const { setupNotificationSocket } = require('./socket/notificationHandler');
setupNotificationSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} with Socket.IO`);
  try {
    const result = await db.testConnection();
    console.log(result);
  } catch (error) {
    console.error('Startup database connection failed:', error.message);
    process.exit(1);
  }
});

server.on('error', (error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});