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
const { getUserStats, getUsersMana, updateUser, deleteUser,connectWallet, createUserNFT, getCreatedNFTs } = require('../controllers/userController');
const { getCategoriesMana, addCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { getBrandsMana, addBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { addToCart, getCart, updateCart, deleteCart } = require('../controllers/cartController');
const { getFavorites, addFavorite, deleteFavorite } = require('../controllers/favoriteController');
const { getNotifications, markNotificationsRead, getNotificationCount } = require('../controllers/notificationController');
const { addPost, getPosts, updatePost, deletePost, getPostImages, getComments } = require('../controllers/postController');
const { applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion } = require('../controllers/promotionController');
const { getCounts } = require('../controllers/countController');
const { getCsrfToken, createOrder, getOrderStatus, getOrderInvoice, getOrderByCode, saveNFTMint } = require('../controllers/orderController');
const { createNFT } = require('../controllers/nftController');

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
router.get('/notifications/count', getNotificationCount);
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

// ====================== ORDERS - ĐÃ HOÀN CHỈNH CHO NFT ======================

// 1. Lấy CSRF token (giữ lại cách cũ nếu frontend vẫn dùng)
router.get('/orders', (req, res) => {
  const { action } = req.query;
  if (action === 'csrf_token') return getCsrfToken(req, res);
  res.status(400).json({ status: 'error', message: 'Invalid action' });
});

// 2. Tạo đơn hàng
router.post('/orders', createOrder);

// 3. Lấy trạng thái đơn hàng (cũ, vẫn dùng được)
router.get('/orders/status', getOrderStatus);

// 4. Lấy hóa đơn PDF (nếu cần)
router.get('/orders/invoice', getOrderInvoice);

// 5. LẤY CHI TIẾT ĐƠN HÀNG THEO MÃ (OrderSuccess.jsx dùng cái này)
//    → Trả về receive_nft + order_detail_id + NFT đã mint (nếu có)
router.get('/orders/code/:order_code', getOrderByCode);

// 6. API MỚI: Lưu NFT sau khi mint thành công (rất quan trọng!)
router.post('/orders/nft-mint', saveNFTMint);

module.exports = router;