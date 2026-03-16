const express = require('express');
const router = express.Router();
const PaymentsController = require('./payments.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { upload } = require('../../../middleware/upload.middleware');

router.post('/proof', authenticate, upload.single('proof_image'), PaymentsController.uploadProof);
router.get('/:orderId', authenticate, PaymentsController.getByOrder);

module.exports = router;
