// src/routes/api.js
const express = require('express');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

const router = express.Router();

// === IMPORT CONTROLLERS ===
const { register, login, logout } = require('../controllers/authController');

const {
  getCategories, getBrands, getProduct, getProducts,
  getProductMana, addProduct, updateProduct, deleteProduct, deleteProductImage
} = require('../controllers/productController');

const { getUserStats, getUsersMana, updateUser, deleteUser } = require('../controllers/userController');

const { getCategoriesMana, addCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { getBrandsMana, addBrand, updateBrand, deleteBrand } = require('../controllers/brandController');

const { addToCart, getCart, updateCart, deleteCart } = require('../controllers/cartController');
const { getFavorites, addFavorite, deleteFavorite } = require('../controllers/favoriteController');
const { notificationSSE, getNotifications, markNotificationsRead } = require('../controllers/notificationController');

const { addPost, getPosts, updatePost, deletePost, getPostImages, getComments } = require('../controllers/postController');
const { applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion } = require('../controllers/promotionController');
const { getCounts } = require('../controllers/countController');

const { getCsrfToken, createOrder, getOrderStatus, getOrderInvoice} = require('../controllers/orderController');

// ====================== AUTH ======================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// ====================== USER ======================
router.get('/user/stats', getUserStats);
router.get('/users/mana', getUsersMana);
router.put('/user', upload.fields([{ name: 'profile_image' }, { name: 'banner_image' }]), updateUser);
router.delete('/user', deleteUser);

// ====================== PRODUCT ======================
router.get('/products/categories', getCategories);
router.get('/products/brands', getBrands);
router.get('/products', getProducts);
router.get('/products/:id', getProduct);         

router.delete('/products/image', deleteProductImage);

// Admin
router.get('/products/mana', getProductMana);
router.post('/products/mana', upload.array('images', 10), addProduct);
router.put('/products/mana', updateProduct);          
router.delete('/products/mana', deleteProduct);      

// ====================== CART ======================
router.post('/cart', addToCart);
router.get('/cart', getCart);
router.put('/cart', updateCart);
router.delete('/cart', deleteCart);

// ====================== FAVORITE ======================
router.get('/favorites', getFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites', deleteFavorite);

// ====================== NOTIFICATIONS ======================
router.get('/notifications/sse', notificationSSE);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);

// ====================== POSTS ======================
router.post('/posts', upload.array('images', 10), addPost);
router.get('/posts', getPosts);
router.put('/posts', updatePost);
router.delete('/posts', deletePost);
router.get('/posts/images', getPostImages);
router.get('/posts/comments', getComments);

// ====================== PROMOTION ======================
router.post('/promotions/apply', applyPromotion);
router.get('/promotions/mana', getPromotionsMana);
router.post('/promotions/mana', addPromotion);
router.put('/promotions/mana', updatePromotion);
router.delete('/promotions/mana', deletePromotion);

// ====================== CATEGORY & BRAND ADMIN ======================
router.get('/categories/mana', getCategoriesMana);
router.post('/categories/mana', addCategory);
router.put('/categories/mana', updateCategory);
router.delete('/categories/mana', deleteCategory);

router.get('/brands/mana', getBrandsMana);
router.post('/brands/mana', addBrand);
router.put('/brands/mana', updateBrand);
router.delete('/brands/mana', deleteBrand);

// ====================== ADMIN DASHBOARD ======================
router.get('/admin/counts', getCounts);

// ====================== ORDERS (ĐÃ SỬA ĐÚNG) ======================
router.get('/orders', (req, res) => {
  const { action, order_code } = req.query;
  if (action === 'csrf_token') return getCsrfToken(req, res);
  if (action === 'status' && order_code) return getOrderStatus(req, res);
  if (action === 'invoice' && order_code) return getOrderInvoice(req, res);
  res.status(400).json({ status: 'error', message: 'Invalid action' });
});

router.post('/orders', createOrder);

module.exports = router;