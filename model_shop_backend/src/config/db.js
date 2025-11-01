const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
  }

  async getConnection() {
    if (!this.pool) {
      try {
        this.pool = mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'model_shop',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          charset: process.env.DB_CHARSET || 'utf8mb4',
          waitForConnections: true,
          connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || 10, 10),
          queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || 0, 10)
        });
        console.log('Database connection pool established successfully');
      } catch (error) {
        console.error('Failed to create connection pool:', error.message);
        throw new Error('Database connection failed: ' + error.message);
      }
    }
    return this.pool;
  }

  async testConnection() {
    try {
      const pool = await this.getConnection();
      // Thực hiện query kiểm tra thực sự
      const [rows] = await pool.execute('SELECT 1 AS test');
      console.log('Test query result:', rows); // Nên in [{ test: 1 }]
      return 'Database connection successful!';
    } catch (error) {
      console.error('Test connection failed:', error.message);
      throw new Error('Connection failed: ' + error.message);
    }
  }

  async closeConnection() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection pool closed');
    }
  }
}

const db = new Database();
module.exports = db;