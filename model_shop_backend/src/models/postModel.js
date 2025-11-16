// src/models/postModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class PostModel {
  static async findAll({ user_id, page = 1, per_page = 10 }) {
    try {
      const pool = await db.getConnection();
      let query = `
        SELECT 
          p.post_id, p.content, p.post_time_status, p.created_at,
          u.user_id, u.full_name,
          ui.image_url AS profile_image,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN user_images ui ON u.user_id = ui.user_id 
          AND ui.image_type = 'profile' 
          AND ui.is_active = TRUE
        WHERE p.is_approved = TRUE
      `;
      const params = [];
      if (user_id) {
        query += ' AND p.user_id = ?';
        params.push(parseInt(user_id));
      }
      query += ' ORDER BY p.created_at DESC';
      query += ` LIMIT ${(page - 1) * per_page}, ${per_page}`;
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      await logError(`Failed to fetch posts: ${error.message}`);
      throw error;
    }
  }

  static async findById(post_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT user_id FROM posts WHERE post_id = ?', [post_id]);
      return rows[0];
    } catch (error) {
      await logError(`Failed to find post by ID: ${error.message}`);
      throw error;
    }
  }

  static async update(post_id, { content, post_time_status }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'UPDATE posts SET content = ?, post_time_status = ? WHERE post_id = ?',
        [content, post_time_status, post_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update post: ${error.message}`);
      throw error;
    }
  }

  static async delete(post_id) {
    try {
      const pool = await db.getConnection();
      await pool.query('DELETE FROM post_images WHERE post_id = ?', [post_id]);
      await pool.query('DELETE FROM likes WHERE post_id = ?', [post_id]);
      await pool.query('DELETE FROM comments WHERE post_id = ?', [post_id]);
      const [result] = await pool.query('DELETE FROM posts WHERE post_id = ?', [post_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete post: ${error.message}`);
      throw error;
    }
  }

  static async getImages(post_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT image_url FROM post_images WHERE post_id = ?', [post_id]);
      return rows.map(img => img.image_url);
    } catch (error) {
      await logError(`Failed to get post images: ${error.message}`);
      throw error;
    }
  }

  static async addImage(post_id, image_url) {
    try {
      const pool = await db.getConnection();
      await pool.query('INSERT INTO post_images (post_id, image_url) VALUES (?, ?)', [post_id, image_url]);
    } catch (error) {
      await logError(`Failed to add post image: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PostModel;