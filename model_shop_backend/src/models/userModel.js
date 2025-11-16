// src/models/userModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class UserModel {
  static async findById(user_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        'SELECT user_id, email, full_name, phone_number, gender, address, role, is_active, created_at FROM users WHERE user_id = ? AND is_active = TRUE',
        [user_id]
      );
      return rows[0];
    } catch (error) {
      await logError(`Failed to find user by ID: ${error.message}`);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0];
    } catch (error) {
      await logError(`Failed to find user by email: ${error.message}`);
      throw error;
    }
  }

  static async create({ email, password, full_name, is_active = true }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'INSERT INTO users (email, password, full_name, is_active) VALUES (?, ?, ?, ?)',
        [email, password, full_name, is_active]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  static async update(user_id, data) {
    try {
      const pool = await db.getConnection();
      const { email, phone_number, address, role, full_name, gender, is_active, password } = data;
      let query = 'UPDATE users SET email = ?, phone_number = ?, address = ?, role = ?, full_name = ?, gender = ?, is_active = ?';
      const params = [email, phone_number || null, address || null, role, full_name, gender || null, is_active];
      if (password) {
        query += ', password = ?';
        params.push(password);
      }
      query += ' WHERE user_id = ?';
      params.push(user_id);
      const [result] = await pool.query(query, params);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update user: ${error.message}`);
      throw error;
    }
  }

  static async delete(user_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('UPDATE users SET is_active = FALSE WHERE user_id = ?', [user_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete user: ${error.message}`);
      throw error;
    }
  }

  static async getStats(user_id) {
    try {
      const pool = await db.getConnection();
      const [followerRows] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [user_id]);
      const [followingRows] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user_id]);
      const [postRows] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_approved = TRUE', [user_id]);
      return {
        followers: followerRows[0].count,
        following: followingRows[0].count,
        posts: postRows[0].count
      };
    } catch (error) {
      await logError(`Failed to get user stats: ${error.message}`);
      throw error;
    }
  }

  static async getImages(user_id) {
    try {
      const pool = await db.getConnection();
      const [images] = await pool.query(
        'SELECT image_id, image_url, image_type FROM user_images WHERE user_id = ? AND is_active = TRUE',
        [user_id]
      );
      return images.reduce((acc, image) => {
        if (image.image_type === 'profile') acc.profile = image.image_url;
        else if (image.image_type === 'banner') acc.banner = image.image_url;
        return acc;
      }, { profile: null, banner: null });
    } catch (error) {
      await logError(`Failed to get user images: ${error.message}`);
      throw error;
    }
  }

  static async updateImage(user_id, image_url, image_type) {
    try {
      const pool = await db.getConnection();
      await pool.query(
        'UPDATE user_images SET is_active = FALSE WHERE user_id = ? AND image_type = ?',
        [user_id, image_type]
      );
      await pool.query(
        'INSERT INTO user_images (user_id, image_url, image_type, is_active) VALUES (?, ?, ?, ?)',
        [user_id, image_url, image_type, true]
      );
    } catch (error) {
      await logError(`Failed to update user image: ${error.message}`);
      throw error;
    }
  }

  static async getSocialLinks(user_id) {
    try {
      const pool = await db.getConnection();
      const [links] = await pool.query(
        'SELECT link_id, platform, link_url, display_name FROM user_social_links WHERE user_id = ?',
        [user_id]
      );
      return links;
    } catch (error) {
      await logError(`Failed to get social links: ${error.message}`);
      throw error;
    }
  }

  static async createSocialLink(user_id, { platform, link_url, display_name }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'INSERT INTO user_social_links (user_id, platform, link_url, display_name) VALUES (?, ?, ?, ?)',
        [user_id, platform, link_url, display_name]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create social link: ${error.message}`);
      throw error;
    }
  }

  static async updateSocialLink(user_id, link_id, { platform, link_url, display_name }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'UPDATE user_social_links SET platform = ?, link_url = ?, display_name = ? WHERE link_id = ? AND user_id = ?',
        [platform, link_url, display_name, link_id, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update social link: ${error.message}`);
      throw error;
    }
  }

  static async deleteSocialLink(user_id, link_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM user_social_links WHERE link_id = ? AND user_id = ?',
        [link_id, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete social link: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserModel;