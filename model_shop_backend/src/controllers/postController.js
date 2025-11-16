// src/controllers/postController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');

const PostModel = require('../models/postModel');

const validateInput = (data) => ({
  content: sanitizeInput(data.content || ''),
  post_time_status: sanitizeInput(data.post_time_status || 'new')
});

const addPost = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;
  const validated = validateInput(req.body);
  const images = req.files?.images;

  if (!validated.content) {
    return res.status(400).json({ status: 'error', message: 'Content is required' });
  }

  if (!['new', 'recent', 'old'].includes(validated.post_time_status)) {
    return res.status(400).json({ status: 'error', message: 'Invalid post time status' });
  }

  try {
    const pool = await db.getConnection();
    await pool.query('START TRANSACTION');

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content, post_time_status, is_approved) VALUES (?, ?, ?, TRUE)',
      [user_id, validated.content, validated.post_time_status]
    );
    const post_id = result.insertId;

    const image_urls = [];
    if (images && Array.isArray(images)) {
      const upload_dir = path.join(__dirname, '../Uploads/posts');
      await fs.mkdir(upload_dir, { recursive: true });

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const ext = path.extname(image.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;

        const newFilename = `${Date.now()}_${i}${ext}`;
        const destination = path.join(upload_dir, newFilename);
        await fs.writeFile(destination, image.buffer);

        await pool.query(
          'INSERT INTO post_images (post_id, image_url) VALUES (?, ?)',
          [post_id, `Uploads/posts/${newFilename}`]
        );
        image_urls.push(`Uploads/posts/${newFilename}`);
      }
    }

    await pool.query('COMMIT');
    res.json({
      status: 'success',
      message: 'Post added successfully',
      post: { post_id, user_id, content: validated.content, images: image_urls }
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    await logError('Error adding post: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error adding post: ' + error.message });
  }
};

const getPosts = async (req, res) => {
  const user_id = req.query.user_id ? parseInt(req.query.user_id) : null;
  const page = parseInt(req.query.page) || 1;
  const per_page = parseInt(req.query.per_page) || 10;

  try {
    const posts = await PostModel.findAll({ user_id, page, per_page });
    const pool = await db.getConnection();

    for (const post of posts) {
      post.images = await PostModel.getImages(post.post_id);
      if (req.session.user_id) {
        const [like] = await pool.query(
          'SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?',
          [req.session.user_id, post.post_id]
        );
        post.is_liked = like.length > 0;
      } else {
        post.is_liked = false;
      }
    }

    res.json({ status: 'success', posts });
  } catch (error) {
    await logError('Error fetching posts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching posts: ' + error.message });
  }
};

const updatePost = async (req, res) => {
  const action = req.query.action;
  const { post_id, content } = req.body;

  if (!post_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
  }

  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  try {
    const pool = await db.getConnection();
    await pool.query('START TRANSACTION');

    const post = await PostModel.findById(post_id);
    if (!post) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (action === 'like') {
      const [existingLike] = await pool.query(
        'SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?',
        [req.session.user_id, post_id]
      );

      if (existingLike.length > 0) {
        await pool.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.session.user_id, post_id]);
        res.json({ status: 'success', message: 'Post unliked', liked: false, like_count: await getLikeCount(post_id) }); // Sử dụng getLikeCount nếu giữ, nhưng đã xóa
      } else {
        await pool.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.session.user_id, post_id]);
        res.json({ status: 'success', message: 'Post liked', liked: true, like_count: await getLikeCount(post_id) });
      }
    } else if (action === 'comment') {
      if (!content) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'Comment content is required' });
      }
      await pool.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [post_id, req.session.user_id, sanitizeInput(content)]);
      res.json({ status: 'success', message: 'Comment added' });
    } else {
      const validated = validateInput(req.body);
      await PostModel.update(post_id, validated);
      res.json({ status: 'success', message: 'Post updated successfully' });
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    await logError('Error updating post: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error updating post: ' + error.message });
  }
};

const deletePost = async (req, res) => {
  const { post_id } = req.body;

  if (!post_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
  }

  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  try {
    const pool = await db.getConnection();
    await pool.query('START TRANSACTION');

    const post = await PostModel.findById(post_id);
    if (!post || post.user_id !== req.session.user_id) {
      await pool.query('ROLLBACK');
      return res.status(403).json({ status: 'error', message: 'Forbidden: You are not the author of this post' });
    }

    const [images] = await pool.query('SELECT image_url FROM post_images WHERE post_id = ?', [post_id]);
    for (const image of images) {
      const file_path = path.join(__dirname, '../', image.image_url);
      if (await fs.access(file_path).then(() => true).catch(() => false)) {
        await fs.unlink(file_path);
      }
    }

    await pool.query('DELETE FROM post_images WHERE post_id = ?', [post_id]);
    await pool.query('DELETE FROM likes WHERE post_id = ?', [post_id]);
    await pool.query('DELETE FROM comments WHERE post_id = ?', [post_id]);
    await pool.query('DELETE FROM posts WHERE post_id = ?', [post_id]);

    await pool.query('COMMIT');
    res.json({ status: 'success', message: 'Post deleted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    await logError('Error deleting post: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error deleting post: ' + error.message });
  }
};

const getPostImages = async (req, res) => {
  const post_id = parseInt(req.query.post_id);

  if (!post_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
  }

  try {
    const pool = await db.getConnection();
    const [images] = await pool.query('SELECT image_url FROM post_images WHERE post_id = ?', [post_id]);
    res.json({ status: 'success', images: images.map(img => img.image_url) });
  } catch (error) {
    await logError('Error fetching images: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching images: ' + error.message });
  }
};

const getComments = async (req, res) => {
  const post_id = parseInt(req.query.post_id);

  if (!post_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
  }

  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(`
      SELECT c.comment_id, c.content, c.created_at, u.full_name, u.profile_image
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [post_id]);
    res.json({ status: 'success', comments: rows });
  } catch (error) {
    await logError('Error fetching comments: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching comments: ' + error.message });
  }
};


module.exports = { addPost, getPosts, updatePost, deletePost, getPostImages, getComments };