const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/auth.routes');
const usersRoutes = require('./users/users.routes');
const productsRoutes = require('./products/products.routes');
const ordersRoutes = require('./orders/orders.routes');
const paymentsRoutes = require('./payments/payments.routes');
const adminRoutes = require('./admin/admin.routes');
const articlesRoutes = require('./articles/articles.routes');

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/admin', adminRoutes);
router.use('/articles', articlesRoutes);

module.exports = router;
