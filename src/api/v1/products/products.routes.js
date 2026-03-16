const express = require('express');
const router = express.Router();
const ProductsController = require('./products.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/role.middleware');
const { upload } = require('../../../middleware/upload.middleware');

router.get('/', ProductsController.getAll);
router.get('/:id', ProductsController.getById);
router.post('/', authenticate, authorize('seller', 'admin'), upload.array('images', 5), ProductsController.create);
router.put('/:id', authenticate, authorize('seller', 'admin'), ProductsController.update);
router.delete('/:id', authenticate, authorize('seller', 'admin'), ProductsController.remove);

module.exports = router;
