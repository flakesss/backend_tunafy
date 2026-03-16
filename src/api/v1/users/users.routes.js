const express = require('express');
const router = express.Router();
const UsersController = require('./users.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/me', authenticate, UsersController.getMe);
router.put('/me', authenticate, UsersController.updateMe);

module.exports = router;
