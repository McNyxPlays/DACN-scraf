// src/routes/api.js
const express = require('express');
const multer = require('multer');
const path = require('path');

// === MULTER CONFIG ===
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

const router = express.Router();

// === IMPORT CONTROLLERS ===
const { register, login, logout } = require('../controllers/authController');
const {
  getCategories, getBrands, getProduct, getProducts, deleteProductImage,
  getProductMana, addProduct, updateProduct, deleteProduct
} = require('../controllers/productController');

const {
  getUserStats, getUsersMana, updateUserMana, deleteUserMana,
  getUserImages, getUser, updateUser, deleteUser
} = require('../controllers/userController');

const {
  getCategoriesMana, addCategory, updateCategory, deleteCategory
} = require('../controllers/categoryController');

const {
  getBrandsMana, addBrand, updateBrand, deleteBrand
} = require('../controllers/brandController');

const {
  addGuestCart, getGuestCart, updateGuestCart, deleteGuestCart,
  addCart, getCart, updateCart, deleteCart
} = require('../controllers/cartController');

const { getFavorites, addFavorite, deleteFavorite } = require('../controllers/favoriteController');

const { notificationSSE, getNotifications, markNotificationsRead } = require('../controllers/notificationController');

const {
  addPost, getPosts, updatePost, deletePost, getPostImages, getComments
} = require('../controllers/postController');

const {
  applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion
} = require('../controllers/promotionController');

const { getCounts } = require('../controllers/countController');

// ======================
// AUTH ROUTES → /api/auth
// ======================
router.options('/register', (req, res) => res.status(200).end());
router.post('/register', register);
router.options('/login', (req, res) => res.status(200).end());
router.post('/login', login);
router.post('/logout', logout); // ← Đã có, giữ nguyên

// ======================
// USER ROUTES → /api/users
// ======================
router.get('/user', getUser);
router.get('/user/stats', getUserStats);
router.get('/user/mana', getUsersMana);
router.put('/user/mana', updateUserMana);
router.delete('/user/mana', deleteUserMana);
router.get('/user/images', getUserImages);
router.put('/user', upload.single('profile_image'), updateUser);
router.delete('/user', deleteUser);
router.get('/user/:id', getUser);          
router.get('/user/images/:id', getUserImages);

// ======================
// PRODUCT ROUTES → /api/products
// ======================
router.get('/products/categories', getCategories);
router.get('/products/brands', getBrands);
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.delete('/products/images', deleteProductImage);

router.get('/products/mana', getProductMana);
router.post('/products/mana', upload.array('images'), addProduct);
router.put('/products/mana', updateProduct);
router.delete('/products/mana', deleteProduct);

// ======================
// CART ROUTES → /api/carts
// ======================
router.post('/carts/guest', addGuestCart);
router.get('/carts/guest', getGuestCart);
router.put('/carts/guest', updateGuestCart);
router.delete('/carts/guest', deleteGuestCart);

router.post('/carts', addCart);
router.get('/carts', getCart);
router.put('/carts', updateCart);
router.delete('/carts', deleteCart);
router.get('/carts/:userId', getCart)

// ======================
// FAVORITE ROUTES → /api/favorites
// ======================
router.get('/favorites', getFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites', deleteFavorite);

// ======================
// NOTIFICATION ROUTES → /api/notifications
// ======================
router.get('/notifications/sse', notificationSSE);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);

// ======================
// ADMIN COUNTS → /api/count
// ======================


// ======================
// POST ROUTES → /api/posts
// ======================
router.post('/posts', upload.array('images'), addPost);
router.get('/posts', getPosts);
router.put('/posts', updatePost);
router.delete('/posts', deletePost);
router.get('/posts/images', getPostImages);
router.get('/posts/comments', getComments);

// ======================
// PROMOTION ROUTES → /api/promotions
// ======================
router.post('/promotions', applyPromotion);
router.get('/promotions/mana', getPromotionsMana);
router.post('/promotions/mana', addPromotion);
router.put('/promotions/mana', updatePromotion);
router.delete('/promotions/mana', deletePromotion);

// ======================
// CATEGORY & BRAND → /api/categories, /api/brands
// ======================
router.get('/categories', getCategoriesMana);
router.post('/categories', addCategory);
router.put('/categories', updateCategory);
router.delete('/categories', deleteCategory);

router.get('/brands', getBrandsMana);
router.post('/brands', addBrand);
router.put('/brands', updateBrand);
router.delete('/brands', deleteBrand);

// === EXPORT ===
module.exports = router;