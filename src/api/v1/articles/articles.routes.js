const express = require('express');
const router = express.Router();
const ArticlesController = require('./articles.controller');

// Public routes — no auth required
// GET /api/v1/articles?lang=id&page=1&limit=12&category=Industri
router.get('/', ArticlesController.getAll);

// GET /api/v1/articles/:slug?lang=id
router.get('/:slug', ArticlesController.getBySlug);

module.exports = router;
