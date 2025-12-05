// src/middleware/auth.js
import { getIo } from '../utils/global.js';

export const requireAuth = (req, res, next) => {
  if (!req.session?.user_id) {
    return res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session?.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Yêu cầu quyền Admin' });
  }
  next();
};