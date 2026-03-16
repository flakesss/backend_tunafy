const express = require('express');
const router = express.Router();
const AdminController = require('./admin.controller');
const ArticlesController = require('../articles/articles.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/role.middleware');
const { upload } = require('../../../middleware/upload.middleware');

// Semua route admin: autentikasi + role admin ATAU seller
router.use(authenticate, authorize('admin', 'seller'));

// Dashboard
router.get('/summary', AdminController.getSummary);

// Users
router.get('/users', AdminController.getAllUsers);
router.put('/users/:id/role', AdminController.updateUserRole);

// Products
router.get('/products', AdminController.getAllProducts);
router.post('/products/upload-images', upload.array('images', 10), AdminController.uploadProductImages);
router.post('/products', AdminController.createProduct);
router.put('/products/:id', AdminController.updateProduct);
router.delete('/products/:id', AdminController.deleteProduct);

// Orders
router.get('/orders', AdminController.getAllOrders);
router.put('/orders/:id/status', AdminController.updateOrderStatus);

// Payments
router.put('/payments/:id/verify', AdminController.verifyPayment);

// Articles (Blog)
router.get('/articles', ArticlesController.adminGetAll);
router.post('/articles', ArticlesController.create);
router.put('/articles/:id', ArticlesController.update);
router.delete('/articles/:id', ArticlesController.remove);
router.patch('/articles/:id/publish', ArticlesController.togglePublish);

module.exports = router;

