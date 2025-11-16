const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, password, full_name } = req.body;
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedFullName = sanitizeInput(full_name);

  if (!sanitizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(
      'INSERT INTO users (email, password, full_name, is_active) VALUES (?, ?, ?, ?)',
      [sanitizedEmail, hashedPassword, sanitizedFullName, true]
    );
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      await logError('Registration failed: ' + error.message);
      res.status(400).json({ message: 'Registration failed: ' + error.message });
    }
  }
};

const login = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, password, remember_me } = req.body;
  const sanitizedEmail = sanitizeInput(email);

  if (!sanitizedEmail || !password) {
    await logError('Error: Email or password missing');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [sanitizedEmail]);
    const user = rows[0];

    if (!user) {
      req.session.loginAttempts = (req.session.loginAttempts || 0) + 1;
      await logError(`Error: User not found for email=${sanitizedEmail}`);
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      await logError(`Error: Account not activated for email=${sanitizedEmail}`);
      return res.status(403).json({ message: 'Account not activated. Please check your email.' });
    }

    if (await bcrypt.compare(password, user.password)) {
      req.session.user_id = user.user_id;
      req.session.loginAttempts = 0;
      console.log(`Success: Session user_id set to ${user.user_id}`); // Debug log (giữ để check session)

      // Handle remember_me with extended maxAge
      if (remember_me) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days for remember
      } else {
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day default
      }

      // Thêm debug: Check session sau khi set
      console.log('Session after login:', req.session); // Debug để confirm session persist

      res.status(200).json({
        message: 'Login successful',
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          profile_image: user.profile_image || null
        }
      });
    } else {
      req.session.loginAttempts = (req.session.loginAttempts || 0) + 1;
      await logError(`Error: Invalid password for email=${sanitizedEmail}`);
      res.status(401).json({ message: 'Invalid password' });
    }
  } catch (error) {
    await logError('Login failed: ' + error.message);
    res.status(500).json({ message: 'Login failed: ' + error.message });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Xóa cookie session
    res.status(200).json({ message: 'Logout successful' });
  });
};

module.exports = { register, login, logout };