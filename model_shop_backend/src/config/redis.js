// src/config/redis.js
const Redis = require('ioredis');

let redisClient;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  console.log('Redis connected via REDIS_URL');
} else if (process.env.NODE_ENV === 'production') {
  // Fallback nếu production nhưng chưa có URL
  console.warn('REDIS_URL not set in production!');
  redisClient = null;
} else {
  // Development: dùng Memory (không cần Redis server)
  redisClient = {
    get: async (key) => null,
    set: async (key, value, mode, time) => null,
    del: async (key) => null,
    flushall: async () => null,
  };
  console.log('Redis disabled (dev mode) – using mock');
}

module.exports = redisClient;