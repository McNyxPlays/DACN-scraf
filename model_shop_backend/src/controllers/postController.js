// src/controllers/postController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');

const addPost = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const user_id = req.session.user_id;
  const content = sanitizeInput(req.body.content || '');
  const images = req.files?.images;

  if (!content) return res.status(400).json({ status: 'error', message: 'Content is required' });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    const [result] = await conn.query(
      'INSERT INTO posts (user_id, content) VALUES (?, ?)',
      [user_id, content]
    );
    const post_id = result.insertId;

    const image_urls = [];
    if (images && Array.isArray(images)) {
      const upload_dir = path.join(__dirname, '../Uploads/posts');
      await fs.mkdir(upload_dir, { recursive: true });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) continue;

        const filename = `${Date.now()}_${i}${ext}`;
        const filepath = path.join(upload_dir, filename);
        await fs.writeFile(filepath, file.buffer);

        const url = `Uploads/posts/${filename}`;
        await conn.query('INSERT INTO post_images (post_id, image_url) VALUES (?, ?)', [post_id, url]);
        image_urls.push(url);
      }
    }

    await conn.query('COMMIT');

    const [newPost] = await conn.query(`
      SELECT p.*, u.full_name, u.profile_image, 0 as like_count, 0 as comment_count, FALSE as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.post_id = ?
    `, [post_id]);

    newPost[0].images = image_urls;

    res.json({ status: 'success', post: newPost[0] });
  } catch (error) {
    await conn.query('ROLLBACK');
    await logError('Error creating post: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error creating post: ' + error.message });
  } finally {
    if (conn) conn.release();
  }
};

const getPosts = async (req, res) => {
  const user_id = req.session.user_id;

  let conn;
  try {
    conn = await db.getConnection();
    const [posts] = await conn.query(`
      SELECT 
        p.post_id, p.user_id, p.content, p.created_at,
        u.full_name, u.profile_image,
        COUNT(DISTINCT l.like_id) as like_count,
        COUNT(DISTINCT c.comment_id) as comment_count,
        EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.post_id AND l2.user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN likes l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [user_id || 0]);

    for (let post of posts) {
      const [images] = await conn.query('SELECT image_url FROM post_images WHERE post_id = ?', [post.post_id]);
      post.images = images.map(img => img.image_url);
    }

    res.json({ status: 'success', posts });
  } catch (error) {
    await logError('Error fetching posts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching posts: ' + error.message });
  } finally {
    if (conn) conn.release();
  }
};

const updatePost = async (req, res) => {
  const user_id = req.session.user_id;
  const { post_id, action, content } = req.body;

  if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  if (!post_id || !action) return res.status(400).json({ status: 'error', message: 'Invalid params' });

  let conn;
  try {
    conn = await db.getConnection();

    if (action === 'like') {
      const [existing] = await conn.query('SELECT like_id FROM likes WHERE user_id = ? AND post_id = ?', [user_id, post_id]);
      if (existing.length) {
        await conn.query('DELETE FROM likes WHERE like_id = ?', [existing[0].like_id]);
        const [count] = await conn.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post_id]);
        return res.json({ status: 'success', liked: false, like_count: count[0].count });
      } else {
        await conn.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [user_id, post_id]);
        const [count] = await conn.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post_id]);
        return res.json({ status: 'success', liked: true, like_count: count[0].count });
      }
    }

    if (action === 'comment') {
      if (!content) return res.status(400).json({ status: 'error', message: 'Content required' });
      await conn.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', 
        [post_id, user_id, sanitizeInput(content)]
      );
      return res.json({ status: 'success', message: 'Commented' }); 
    }

    return res.status(400).json({ status: 'error', message: 'Invalid action' });

  } catch (error) {
    await logError('Error updating post: ' + error.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const deletePost = async (req, res) => {
  const user_id = req.session.user_id;
  const { post_id } = req.body;

  if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  if (!post_id) return res.status(400).json({ status: 'error', message: 'Invalid post ID' });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    const [post] = await conn.query('SELECT user_id FROM posts WHERE post_id = ?', [post_id]);
    if (!post.length || post[0].user_id !== user_id) {
      return res.status(403).json({ status: 'error', message: 'Not owner' });
    }

    // Delete images
    const [images] = await conn.query('SELECT image_url FROM post_images WHERE post_id = ?', [post_id]);
    for (let img of images) {
      try {
        await fs.unlink(path.join(__dirname, '..', img.image_url));
      } catch (e) {
        console.warn('Failed to delete image:', e);
      }
    }

    await conn.query('DELETE FROM post_images WHERE post_id = ?', [post_id]);
    await conn.query('DELETE FROM comments WHERE post_id = ?', [post_id]);
    await conn.query('DELETE FROM likes WHERE post_id = ?', [post_id]);
    await conn.query('DELETE FROM posts WHERE post_id = ?', [post_id]);

    await conn.query('COMMIT');
    res.json({ status: 'success', message: 'Post deleted' });
  } catch (error) {
    await conn.query('ROLLBACK');
    await logError('Error deleting post: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error deleting post' });
  } finally {
    if (conn) conn.release();
  }
};

const getPostImages = async (req, res) => {
  const post_id = parseInt(req.query.post_id);

  if (!post_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
  }

  try {
    const conn = await db.getConnection();
    const [images] = await conn.query('SELECT image_url FROM post_images WHERE post_id = ?', [post_id]);
    res.json({ status: 'success', images: images.map(img => img.image_url) });
  } catch (error) {
    await logError('Error fetching images: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching images' });
  } finally {
    if (conn) conn.release();
  }
};

const getComments = async (req, res) => {
  const post_id = parseInt(req.query.post_id);
  if (!post_id) return res.status(400).json({ status: 'error', message: 'Invalid post ID' });

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT 
        c.comment_id, c.content, c.created_at, 
        u.full_name, u.profile_image
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [post_id]);

    const comments = rows.map(row => ({
      ...row,
      profile_image: row.profile_image || null
    }));

    res.json({ status: 'success', comments });
  } catch (error) {
    await logError('Error fetching comments: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching comments' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { addPost, getPosts, updatePost, deletePost, getPostImages, getComments };