// src/controllers/categoryController.js
const db = require('../config/db');
const { logError } = require('../config/functions');

const getCategoriesMana = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();

    if (req.query.id) {
      const id = parseInt(req.query.id);
      const [categoryRows] = await pool.query(
        'SELECT category_id, name, description FROM categories WHERE category_id = ?',
        [id]
      );
      const category = categoryRows[0];
      if (category) {
        res.json({ status: 'success', data: [category] });
      } else {
        res.status(404).json({ status: 'error', message: 'Category not found' });
      }
    } else {
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const [categories] = await pool.query(
        'SELECT category_id, name, description FROM categories WHERE name LIKE ?',
        [search]
      );
      res.json({ status: 'success', data: categories });
    }
  } catch (error) {
    await logError('Failed to fetch categories: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const addCategory = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const [existing] = await pool.query('SELECT category_id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Category name already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    res.json({ status: 'success', message: 'Category added', id: result.insertId });
  } catch (error) {
    await logError('Failed to add category: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to add category: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const updateCategory = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const id = parseInt(req.query.id);
    const { name, description } = req.body;

    if (!name || !id || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid input' });
    }

    const [existing] = await pool.query('SELECT category_id FROM categories WHERE name = ? AND category_id != ?', [name, id]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Category name already exists' });
    }

    const [result] = await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE category_id = ?',
      [name, description || '', id]
    );
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Category updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Category not found' });
    }
  } catch (error) {
    await logError('Failed to update category: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update category: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const deleteCategory = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const id = parseInt(req.query.id);
    if (id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid category ID' });
    }

    const [result] = await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Category deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Category not found' });
    }
  } catch (error) {
    await logError('Failed to delete category: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete category: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

module.exports = { getCategoriesMana, addCategory, updateCategory, deleteCategory };