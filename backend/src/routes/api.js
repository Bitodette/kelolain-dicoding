const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const transactionController = require('../controllers/transactionController');
const financeController = require('../controllers/financeController');
const aiController = require('../controllers/aiController');
const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const roleController = require('../controllers/roleController');
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const multer = require('multer');

const receiptController = require('../controllers/receiptController');

const upload = multer({ storage: multer.memoryStorage() });

// ROUTES AUTH
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authController.me);

// ROUTES PRODUK
router.get('/products', authenticate, productController.getProducts);
router.post('/products', authenticate, productController.createProduct);
router.put('/products/:id', authenticate, productController.updateProduct);
router.post('/products/:id/restock', authenticate, productController.restockProduct);
router.delete('/products/:id', authenticate, productController.deleteProduct);

// ROUTES KATEGORI
router.get('/categories', authenticate, categoryController.getCategories);
router.post('/categories', authenticate, categoryController.createCategory);
router.delete('/categories/:id', authenticate, categoryController.deleteCategory);

// ROUTES ROLE
router.get('/roles', authenticate, roleController.getRoles);
router.post('/roles', authenticate, roleController.createRole);
router.put('/roles/:id', authenticate, roleController.updateRole);
router.delete('/roles/:id', authenticate, roleController.deleteRole);

// ROUTES USER
router.get('/users', authenticate, userController.getUsers);
router.post('/users', authenticate, userController.createUser);
router.put('/users/:id', authenticate, userController.updateUser);
router.delete('/users/:id', authenticate, userController.deleteUser);

// ROUTES TRANSAKSI 
router.get('/transactions', authenticate, transactionController.getTransactions);
router.post('/transactions', authenticate, transactionController.createTransaction);
router.get('/transactions/:id', authenticate, transactionController.getTransactionById);
router.put('/transactions/:id', authenticate, transactionController.updateTransaction);
router.delete('/transactions/:id', authenticate, transactionController.deleteTransaction);

// ROUTES AGREGASI FINANSIAL
router.get('/finance/overview', authenticate, financeController.getFinanceOverview);

// ROUTES AI
router.get('/ai/revenue', authenticate, aiController.getRevenuePrediction);
router.get('/ai/demand', authenticate, aiController.getDemandPrediction);
router.get('/ai/bundling', authenticate, aiController.getBundlingSuggestion);
router.post('/ai/ocr/check-blur', authenticate, upload.single('receipt'), aiController.checkReceiptBlur);
router.post('/ai/ocr/scan', authenticate, upload.single('receipt'), aiController.scanReceipt);

// ROUTES RECEIPT STORAGE
router.post('/receipts/upload', authenticate, upload.single('receipt'), receiptController.uploadReceipt);
router.get('/receipts', authenticate, receiptController.getReceipts);

module.exports = router;
