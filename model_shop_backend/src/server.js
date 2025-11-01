// server.js
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
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