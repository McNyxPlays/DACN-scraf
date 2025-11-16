// src/controllers/userController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');

const getUserStats = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;

  try {
    const pool = await db.getConnection();

    const [followerRows] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [user_id]);
    const followers = followerRows[0].count;

    const [followingRows] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user_id]);
    const following = followingRows[0].count;

    const [postRows] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_approved = TRUE', [user_id]);
    const posts = postRows[0].count;

    res.status(200).json({ status: 'success', followers, following, posts });
  } catch (error) {
    await logError('Error fetching stats: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching stats: ' + error.message });
  }
};

const getUsersMana = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, message: 'Unauthorized - No session' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not an admin' });
    }

    if (req.query.id) {
      const id = parseInt(req.query.id);
      const [userRows] = await pool.query(
        'SELECT user_id, email, phone_number, address, role, full_name, gender, is_active, created_at FROM users WHERE user_id = ?',
        [id]
      );
      const user = userRows[0];
      if (user) {
        res.json({ success: true, message: 'User fetched', data: [user] });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } else {
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const is_active = parseInt(req.query.is_active) >= 0 ? parseInt(req.query.is_active) : -1;
      let query = 'SELECT user_id, email, phone_number, address, role, full_name, gender, is_active, created_at FROM users WHERE email LIKE ? OR phone_number LIKE ?';
      const params = [search, search];
      if (is_active >= 0) {
        query += ' AND is_active = ?';
        params.push(is_active);
      }
      const [users] = await pool.query(query, params);
      res.json({ success: true, message: 'Users fetched', data: users });
    }
  } catch (error) {
    await logError('Failed to fetch users: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users: ' + error.message });
  }
};

const updateUserMana = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, message: 'Unauthorized - No session' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not an admin' });
    }

    const id = parseInt(req.query.id);
    const { email, phone_number, address, role, full_name, gender, is_active } = req.body;

    if (id <= 0 || !email || !full_name) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const [existingEmail] = await pool.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, id]);
    if (existingEmail.length) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const [result] = await pool.query(
      'UPDATE users SET email = ?, phone_number = ?, address = ?, role = ?, full_name = ?, gender = ?, is_active = ? WHERE user_id = ?',
      [email, phone_number || null, address || null, role, full_name, gender || null, is_active, id]
    );

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'User updated' });
    } else {
      res.status(404).json({ success: false, message: 'No changes made to user' });
    }
  } catch (error) {
    await logError('Failed to update user: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to update user: ' + error.message });
  }
};

const deleteUserMana = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, message: 'Unauthorized - No session' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not an admin' });
    }

    const id = parseInt(req.query.id);
    if (id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'User deleted' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    await logError('Failed to delete user: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to delete user: ' + error.message });
  }
};

const getUserImages = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: Please log in');
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;

  try {
    const pool = await db.getConnection();
    const [images] = await pool.query(
      'SELECT image_id, image_url, image_type FROM user_images WHERE user_id = ? AND is_active = TRUE',
      [user_id]
    );

    const user_images = { profile: null, banner: null };
    images.forEach(image => {
      if (image.image_type === 'profile') user_images.profile = image.image_url;
      else if (image.image_type === 'banner') user_images.banner = image.image_url;
    });

    res.status(200).json({ status: 'success', images: user_images });
  } catch (error) {
    await logError('Error fetching user images: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Error fetching user images: ' + error.message });
  }
};

const getUser = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: Please log in');
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query(
      'SELECT user_id, email, full_name, phone_number, gender, address, role, is_active, created_at FROM users WHERE user_id = ? AND is_active = TRUE',
      [user_id]
    );
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const [imageRows] = await pool.query(
      'SELECT image_url FROM user_images WHERE user_id = ? AND image_type = "profile" AND is_active = TRUE LIMIT 1',
      [user_id]
    );
    user.profile_image = imageRows[0]?.image_url || '';

    res.json({ status: 'success', user });
  } catch (error) {
    await logError('Failed to fetch user: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user: ' + error.message });
  }
};

const updateUser = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: Please log in');
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;
  const { full_name, email, phone_number, gender, address, role, is_active, password } = req.body;
  const profile_image = req.files?.profile_image;

  try {
    const pool = await db.getConnection();
    await pool.query('START TRANSACTION');

    const [existingUser] = await pool.query('SELECT email FROM users WHERE user_id = ?', [user_id]);
    if (!existingUser[0]) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (email && email !== existingUser[0].email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'Invalid email format' });
      }

      const [emailCheck] = await pool.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, user_id]);
      if (emailCheck.length) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'Email already exists' });
      }
    }

    let query = 'UPDATE users SET full_name = ?, email = ?, phone_number = ?, gender = ?, address = ?, role = ?, is_active = ?';
    const params = [full_name, email || existingUser[0].email, phone_number || null, gender || null, address || null, role, is_active];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE user_id = ?';
    params.push(user_id);

    await pool.query(query, params);

    if (profile_image) {
      const ext = path.extname(profile_image.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'Invalid image format' });
      }

      const newFilename = `${Date.now()}_profile${ext}`;
      const destination = path.join(__dirname, '../Uploads/avatars', newFilename);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, profile_image.buffer);

      await pool.query(
        'UPDATE user_images SET is_active = FALSE WHERE user_id = ? AND image_type = "profile"',
        [user_id]
      );
      await pool.query(
        'INSERT INTO user_images (user_id, image_url, image_type, is_active) VALUES (?, ?, ?, ?)',
        [user_id, newFilename, 'profile', true]
      );
    }

    const [updatedUser] = await pool.query(
      'SELECT user_id, email, full_name, phone_number, gender, address, role, is_active, created_at FROM users WHERE user_id = ? AND is_active = TRUE',
      [user_id]
    );

    if (!updatedUser[0]) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'User not found or no changes made' });
    }

    const [imageRows] = await pool.query(
      'SELECT image_url FROM user_images WHERE user_id = ? AND image_type = "profile" AND is_active = TRUE LIMIT 1',
      [user_id]
    );
    updatedUser[0].profile_image = imageRows[0]?.image_url || '';

    await pool.query('COMMIT');
    res.json({
      status: 'success',
      message: profile_image ? 'Profile updated with new image' : 'Profile updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    await logError('PUT request error: ' + error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const deleteUser = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: Please log in');
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;

  try {
    const pool = await db.getConnection();
    const [result] = await pool.query('UPDATE users SET is_active = FALSE WHERE user_id = ?', [user_id]);

    if (result.affectedRows > 0) {
      req.session.destroy();
      res.status(200).json({ status: 'success', message: 'User account deactivated' });
    } else {
      res.status(404).json({ status: 'error', message: 'User not found' });
    }
  } catch (error) {
    await logError('Deletion failed: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Deletion failed: ' + error.message });
  }
};

module.exports = { getUserStats, getUsersMana, updateUserMana, deleteUserMana, getUserImages, getUser, updateUser, deleteUser };