const express = require('express');
const router = express.Router();
const ShippingController = require('./shipping.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/addresses', authenticate, ShippingController.getAddresses);
router.post('/addresses', authenticate, ShippingController.addAddress);
router.delete('/addresses/:id', authenticate, ShippingController.removeAddress);

module.exports = router;
