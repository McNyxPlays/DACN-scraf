// src/models/messageModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class MessageModel {
  static async getConversationsForUser(user_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(`
        SELECT 
          c.conversation_id,
          IF(c.participant1_id = ?, c.participant2_id, c.participant1_id) AS other_user_id,
          u.full_name AS other_user_name,
          u.profile_image AS other_profile_image,
          (SELECT m.content FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
          (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id AND m.is_read = FALSE AND m.sender_id != ?) AS unread_count
        FROM conversations c
        JOIN users u ON u.user_id = IF(c.participant1_id = ?, c.participant2_id, c.participant1_id)
        WHERE c.participant1_id = ? OR c.participant2_id = ?
        ORDER BY last_message_time DESC
      `, [user_id, user_id, user_id, user_id, user_id]);
      return rows;
    } catch (error) {
      await logError(`Failed to get conversations: ${error.message}`);
      throw error;
    }
  }

  static async getMessagesInConversation(conversation_id, user_id) {
    try {
      const pool = await db.getConnection();
      // Mark messages as read for this user
      await pool.query(`
        UPDATE messages 
        SET is_read = TRUE 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
      `, [conversation_id, user_id]);

      const [rows] = await pool.query(`
        SELECT 
          m.message_id, m.sender_id, m.content, m.media_url, m.created_at, m.is_read,
          u.full_name AS sender_name,
          u.profile_image AS sender_profile_image
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `, [conversation_id]);
      return rows;
    } catch (error) {
      await logError(`Failed to get messages: ${error.message}`);
      throw error;
    }
  }

  static async createConversation(participant1_id, participant2_id) {
    try {
      const pool = await db.getConnection();
      // Check if conversation exists
      const [existing] = await pool.query(`
        SELECT conversation_id 
        FROM conversations 
        WHERE (participant1_id = ? AND participant2_id = ?) 
           OR (participant1_id = ? AND participant2_id = ?)
      `, [participant1_id, participant2_id, participant2_id, participant1_id]);

      if (existing.length > 0) {
        return existing[0].conversation_id;
      }

      const [result] = await pool.query(`
        INSERT INTO conversations (participant1_id, participant2_id) 
        VALUES (?, ?)
      `, [Math.min(participant1_id, participant2_id), Math.max(participant1_id, participant2_id)]);
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create conversation: ${error.message}`);
      throw error;
    }
  }

  static async addMessage(conversation_id, sender_id, content, media_url = null) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, media_url) 
        VALUES (?, ?, ?, ?)
      `, [conversation_id, sender_id, content, media_url]);
      return result.insertId;
    } catch (error) {
      await logError(`Failed to add message: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MessageModel;