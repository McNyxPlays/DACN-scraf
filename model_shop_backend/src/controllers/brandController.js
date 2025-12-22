// src/controllers/brandController.js
const db = require('../config/db');
const { logError } = require('../config/functions');

const getBrandsMana = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();

    if (req.query.id) {
      const id = parseInt(req.query.id);
      const [brandRows] = await pool.query(
        'SELECT brand_id, name, description FROM brands WHERE brand_id = ?',
        [id]
      );
      const brand = brandRows[0];
      if (brand) {
        res.json({ status: 'success', data: [brand] });
      } else {
        res.status(404).json({ status: 'error', message: 'Brand not found' });
      }
    } else {
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const [brands] = await pool.query(
        'SELECT brand_id, name, description FROM brands WHERE name LIKE ?',
        [search]
      );
      res.json({ status: 'success', data: brands });
    }
  } catch (error) {
    console.error('Error in getBrandsMana:', error.stack);
    await logError('Failed to fetch brands: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch brands: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const addBrand = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const [existing] = await pool.query('SELECT brand_id FROM brands WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Brand name already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO brands (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    res.json({ status: 'success', message: 'Brand added', id: result.insertId });
  } catch (error) {
    console.error('Error in addBrand:', error.stack);
    await logError('Failed to add brand: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to add brand: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const updateBrand = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const id = parseInt(req.query.id);
    const { name, description } = req.body;

    if (!name || !id || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid input' });
    }

    const [existing] = await pool.query('SELECT brand_id FROM brands WHERE name = ? AND brand_id != ?', [name, id]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Brand name already exists' });
    }

    const [result] = await pool.query(
      'UPDATE brands SET name = ?, description = ? WHERE brand_id = ?',
      [name, description || '', id]
    );
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Brand updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Brand not found' });
    }
  } catch (error) {
    console.error('Error in updateBrand:', error.stack);
    await logError('Failed to update brand: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update brand: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

const deleteBrand = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const id = parseInt(req.query.id);
    if (id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid brand ID' });
    }

    const [result] = await pool.query('DELETE FROM brands WHERE brand_id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Brand deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Brand not found' });
    }
  } catch (error) {
    console.error('Error in deleteBrand:', error.stack);
    await logError('Failed to delete brand: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete brand: ' + error.message });
  } finally {
    if (pool) pool.release();
  }
};

module.exports = { getBrandsMana, addBrand, updateBrand, deleteBrand };