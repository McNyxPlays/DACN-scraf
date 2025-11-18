// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'model_shop',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || 15, 10),
      queueLimit: 0,
      timezone: '+07:00',
      connectTimeout: 10000,
    };
  }

  // Tạo pool nếu chưa có
  async ensurePool() {
    if (!this.pool) {
      try {
        this.pool = mysql.createPool(this.config);
        console.log('MySQL Pool created successfully!');
      } catch (err) {
        console.error('Failed to create MySQL pool:', err.message);
        throw err;
      }
    }
    return this.pool;
  }

  // DÙNG CHÍNH HÀM NÀY TRONG TOÀN BỘ CONTROLLER (thay cho getConnection + release)
  async query(sql, params = []) {
    const pool = await this.ensurePool();
    return await pool.query(sql, params);
  }

  async execute(sql, params = []) {
    const pool = await this.ensurePool();
    return await pool.execute(sql, params);
  }

  // Chỉ dùng khi cần transaction (rất ít)
  async getConnection() {
    const pool = await this.ensurePool();
    return await pool.getConnection();
  }

  // TEST KẾT NỐI SIÊU CHI TIẾT – DÙNG ĐỂ KIỂM TRA XAMPP CÓ CHẠY KHÔNG
  async testConnection() {
    let pool;
    try {
      pool = await this.ensurePool();

      console.log('Testing database connection...');
      const [result] = await pool.query(`
        SELECT 
          NOW() AS server_time,
          DATABASE() AS current_db,
          USER() AS connected_user,
          VERSION() AS mysql_version,
          1+1 AS test_calc
      `);

      const info = result[0];

      console.log('DATABASE CONNECTED SUCCESSFULLY!');
      console.log('   Server Time :', info.server_time);
      console.log('   Database    :', info.current_db || '(none)');
      console.log('   User        :', info.connected_user);
      console.log('   MySQL Ver   :', info.mysql_version);
      console.log('   Test Calc   :', info.test_calc);

      return {
        success: true,
        message: 'Database connected!',
        data: info
      };
    } catch (error) {
      console.error('DATABASE CONNECTION FAILED!');
      console.error('   Host        :', this.config.host + ':' + this.config.port);
      console.error('   Database    :', this.config.database);
      console.error('   User        :', this.config.user);
      console.error('   Error Code  :', error.code);
      console.error('   Message     :', error.message);

      // Gợi ý lỗi thường gặp
      if (error.code === 'ECONNREFUSED') {
        console.error('   → XAMPP/MySQL chưa được bật!');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('   → Sai username hoặc password!');
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.error('   → Database "' + this.config.database + '" không tồn tại!');
      }

      return {
        success: false,
        message: 'Connection failed: ' + error.message,
        error: error.code
      };
    }
  }

  // Đóng pool khi tắt server
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL connection pool closed.');
      this.pool = null;
    }
  }
}

// Export instance duy nhất
const db = new Database();
module.exports = db;