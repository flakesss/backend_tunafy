const express = require('express');
const router = express.Router();
const OrdersController = require('./orders.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

// Semua route orders memerlukan autentikasi
router.use(authenticate);

// ─── Cart Routes ──────────────────────────────────────────────────
// GET    /api/v1/orders/cart
// POST   /api/v1/orders/cart
// PUT    /api/v1/orders/cart/:productId
// DELETE /api/v1/orders/cart/:productId

router.get('/cart', OrdersController.getCart);
router.post('/cart', OrdersController.addToCart);
router.put('/cart/:productId', OrdersController.updateCartQty);
router.delete('/cart/:productId', OrdersController.removeFromCart);

// ─── Order Routes ─────────────────────────────────────────────────
// GET  /api/v1/orders      → riwayat order user
// POST /api/v1/orders      → buat order dari cart (checkout)
// GET  /api/v1/orders/:id  → detail satu order
// PUT  /api/v1/orders/:id/status → update status (cancel)

router.get('/', OrdersController.getAll);
router.post('/', OrdersController.createOrder);
router.get('/:id', OrdersController.getById);
router.put('/:id/status', OrdersController.updateStatus);

module.exports = router;
