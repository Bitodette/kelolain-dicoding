const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const productController = require('../controllers/productController');
const transactionController = require('../controllers/transactionController');
const financeController = require('../controllers/financeController');
const aiController = require('../controllers/aiController');
const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const roleController = require('../controllers/roleController');
const userController = require('../controllers/userController');
const notificationController = require('../controllers/notificationController');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/authorize');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi 15 menit.' },
});

// ROUTES AUTH
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/register', authLimiter, authController.register);
router.get('/auth/me', authenticate, authController.me);
router.put('/auth/profile', authenticate, authController.updateProfile);

// ROUTES PRODUK (butuh akses halaman 'produk')
router.get('/products', authenticate, authorize('produk'), productController.getProducts);
router.post('/products', authenticate, authorize('produk'), productController.createProduct);
router.put('/products/:id', authenticate, authorize('produk'), productController.updateProduct);
router.post('/products/:id/restock', authenticate, authorize('produk'), productController.restockProduct);
router.delete('/products/:id', authenticate, authorize('produk'), productController.deleteProduct);

// ROUTES KATEGORI (dikelola dari halaman 'produk')
router.get('/categories', authenticate, authorize('produk'), categoryController.getCategories);
router.post('/categories', authenticate, authorize('produk'), categoryController.createCategory);
router.delete('/categories/:id', authenticate, authorize('produk'), categoryController.deleteCategory);

// ROUTES ROLE (admin - butuh akses halaman 'settings')
router.get('/roles', authenticate, authorize('settings'), roleController.getRoles);
router.post('/roles', authenticate, authorize('settings'), roleController.createRole);
router.put('/roles/:id', authenticate, authorize('settings'), roleController.updateRole);
router.delete('/roles/:id', authenticate, authorize('settings'), roleController.deleteRole);

// ROUTES USER (admin - butuh akses halaman 'settings')
router.get('/users', authenticate, authorize('settings'), userController.getUsers);
router.post('/users', authenticate, authorize('settings'), userController.createUser);
router.put('/users/:id', authenticate, authorize('settings'), userController.updateUser);
router.delete('/users/:id', authenticate, authorize('settings'), userController.deleteUser);

// ROUTES TRANSAKSI (butuh akses 'kasir' atau 'keuangan')
router.get('/transactions', authenticate, authorize('kasir', 'keuangan'), transactionController.getTransactions);
router.post('/transactions', authenticate, authorize('kasir'), transactionController.createTransaction);
router.get('/transactions/:id', authenticate, authorize('kasir', 'keuangan'), transactionController.getTransactionById);
router.put('/transactions/:id', authenticate, authorize('kasir', 'keuangan'), transactionController.updateTransaction);
router.delete('/transactions/:id', authenticate, authorize('kasir', 'keuangan'), transactionController.deleteTransaction);

// ROUTES AGREGASI FINANSIAL (butuh akses halaman 'keuangan')
router.get('/finance/overview', authenticate, authorize('keuangan'), financeController.getFinanceOverview);

// ROUTES DASHBOARD (semua yang login bisa akses)
router.get('/dashboard', authenticate, dashboardController.getDashboardSummary);

// ROUTES AI (dipakai di beberapa halaman, cukup auth saja)
router.get('/ai/revenue', authenticate, aiController.getRevenuePrediction);
router.get('/ai/demand', authenticate, aiController.getDemandPrediction);
router.get('/ai/bundling', authenticate, aiController.getBundlingSuggestion);
router.post('/ai/ocr/check-blur', authenticate, upload.single('receipt'), aiController.checkReceiptBlur);
router.post('/ai/ocr/scan', authenticate, upload.single('receipt'), aiController.scanReceipt);

// ROUTES NOTIFIKASI (semua yang login bisa akses)
router.get('/notifications', authenticate, notificationController.getNotifications);
router.patch('/notifications/read-all', authenticate, notificationController.markAllRead);
router.patch('/notifications/:id/read', authenticate, notificationController.markRead);

module.exports = router;
