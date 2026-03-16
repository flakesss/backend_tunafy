const asyncHandler = require('../../../utils/asyncHandler');
const ProductsService = require('./products.service');
const ApiResponse = require('../../../utils/ApiResponse');

const getAll = asyncHandler(async (req, res) => {
  const data = await ProductsService.getAll(req.query);
  res.json(ApiResponse.success(data));
});

const getById = asyncHandler(async (req, res) => {
  const data = await ProductsService.getById(req.params.id);
  res.json(ApiResponse.success(data));
});

const create = asyncHandler(async (req, res) => {
  const data = await ProductsService.create(req.body, req.files, req.user.id);
  res.status(201).json(ApiResponse.created(data, 'Produk berhasil ditambahkan'));
});

const update = asyncHandler(async (req, res) => {
  const data = await ProductsService.update(req.params.id, req.body, req.user.id);
  res.json(ApiResponse.success(data, 'Produk berhasil diperbarui'));
});

const remove = asyncHandler(async (req, res) => {
  await ProductsService.remove(req.params.id, req.user.id);
  res.json(ApiResponse.success(null, 'Produk berhasil dihapus'));
});

module.exports = { getAll, getById, create, update, remove };
