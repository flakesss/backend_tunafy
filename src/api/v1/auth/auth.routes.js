const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');

// POST /api/v1/auth/register
router.post('/register', AuthController.register);

// POST /api/v1/auth/login
router.post('/login', AuthController.login);

// POST /api/v1/auth/logout
router.post('/logout', AuthController.logout);

// POST /api/v1/auth/refresh
router.post('/refresh', AuthController.refresh);

// GET /api/v1/auth/check-username?username=...
router.get('/check-username', AuthController.checkUsername);

// POST /api/v1/auth/oauth/callback — sinkronisasi profil user Google ke DB
router.post('/oauth/callback', AuthController.oauthCallback);

module.exports = router;
