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
  getProductMana, addProduct, updateProduct, deleteProduct
} = require('../controllers/productController');
const { getUserStats, getUsersMana, updateUser, deleteUser,connectWallet, createUserNFT, getCreatedNFTs } = require('../controllers/userController');
const { getCategoriesMana, addCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { getBrandsMana, addBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { addToCart, getCart, updateCart, deleteCart } = require('../controllers/cartController');
const { getFavorites, addFavorite, deleteFavorite } = require('../controllers/favoriteController');
const { getNotifications, markNotificationsRead, getNotificationCount, sendNotification } = require('../controllers/notificationController');
const { addPost, getPosts, updatePost, deletePost, getPostImages, getComments } = require('../controllers/postController');
const { applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion } = require('../controllers/promotionController');
const { getCounts } = require('../controllers/countController');
const { getCsrfToken, createOrder, getOrderStatus, getOrderInvoice, getOrderByCode, getOrdersMana, updateOrderStatus, saveNFTMint, getUserOrders } = require('../controllers/orderController');
const { createNFT, getOrderNftMints, getUserNFTs, getAllUserNfts } = require('../controllers/nftController');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');
const { chatWithAI } = require('../controllers/aiChatController');

// ====================== AUTH ======================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// ====================== USER ======================
router.get('/user/stats', getUserStats);
router.get('/users/mana', getUsersMana);
router.put('/user', upload.fields([{ name: 'profile_image' }, { name: 'banner_image' }]), updateUser);
router.delete('/user', deleteUser);
// ====================== NFT ======================
router.post('/user/connect-wallet', connectWallet);
router.get('/user/nfts/created', getCreatedNFTs);
router.post('/nft/create', upload.single('image'), createNFT)
router.get('/nft/user-nfts', getUserNFTs);
router.get('/users/nft', getAllUserNfts);

// ====================== PRODUCT ======================
router.get('/products/categories', getCategories);
router.get('/products/brands', getBrands);
router.get('/products', getProducts);
router.get('/products/:id', getProduct);

// Admin
router.get('/product/mana', getProductMana);
router.post('/product/mana', upload.array('images', 10), addProduct);
router.put('/product/mana', updateProduct);
router.delete('/product/mana', deleteProduct);

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
router.get('/notifications/count', getNotificationCount);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);
router.post('/notifications/send', sendNotification);

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
router.get('/order-nft-mints', getOrderNftMints);

// ====================== ORDERS - ĐÃ HOÀN CHỈNH CHO NFT ======================
router.get('/orders', (req, res) => {
  const { action } = req.query;
  if (action === 'csrf_token') return getCsrfToken(req, res);
  res.status(400).json({ status: 'error', message: 'Invalid action' });
});
router.post('/orders', createOrder);
router.get('/orders/status', getOrderStatus);
router.get('/orders/invoice', getOrderInvoice);
router.get('/orders/code/:order_code', getOrderByCode);
router.post('/orders/nft-mint', saveNFTMint);
router.get('/orders/mana', getOrdersMana);
router.put('/orders/mana', updateOrderStatus);
router.get('/user/orders', getUserOrders);

// ====================== MESSAGES ======================
router.get('/messages', (req, res) => {
  if (req.query.conversation_id) {
    return getMessages(req, res);
  } else {
    return getConversations(req, res);
  }
});
router.post('/messages', sendMessage);

// ====================== IA ======================
router.post('/ai-chat', chatWithAI);

module.exports = router;