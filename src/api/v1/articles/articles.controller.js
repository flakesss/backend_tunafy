const asyncHandler = require('../../../utils/asyncHandler');
const ArticlesService = require('./articles.service');
const ApiResponse = require('../../../utils/ApiResponse');

// ─── Public ──────────────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
  const data = await ArticlesService.getAll(req.query);
  res.json(ApiResponse.success(data));
});

const getBySlug = asyncHandler(async (req, res) => {
  const lang = req.query.lang || 'id';
  const data = await ArticlesService.getBySlug(req.params.slug, lang);
  res.json(ApiResponse.success(data));
});

// ─── Admin ────────────────────────────────────────────────────────────
const adminGetAll = asyncHandler(async (req, res) => {
  const data = await ArticlesService.adminGetAll(req.query);
  res.json(ApiResponse.success(data));
});

const create = asyncHandler(async (req, res) => {
  const data = await ArticlesService.create(req.body);
  res.status(201).json(ApiResponse.created(data, 'Artikel berhasil dibuat'));
});

const update = asyncHandler(async (req, res) => {
  const data = await ArticlesService.update(req.params.id, req.body);
  res.json(ApiResponse.success(data, 'Artikel berhasil diperbarui'));
});

const remove = asyncHandler(async (req, res) => {
  await ArticlesService.remove(req.params.id);
  res.json(ApiResponse.success(null, 'Artikel berhasil dihapus'));
});

const togglePublish = asyncHandler(async (req, res) => {
  const data = await ArticlesService.togglePublish(req.params.id);
  res.json(ApiResponse.success(data, data.is_published ? 'Artikel dipublikasikan' : 'Artikel dijadikan draft'));
});

module.exports = { getAll, getBySlug, adminGetAll, create, update, remove, togglePublish };
