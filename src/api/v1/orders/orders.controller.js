const asyncHandler = require('../../../utils/asyncHandler');
const OrdersService = require('./orders.service');
const ApiResponse = require('../../../utils/ApiResponse');

// ─── Cart ─────────────────────────────────────────────────────────

const getCart = asyncHandler(async (req, res) => {
  const data = await OrdersService.getCart(req.user.id);
  res.json(ApiResponse.success(data));
});

const addToCart = asyncHandler(async (req, res) => {
  const { product_id, qty_kg } = req.body;
  const data = await OrdersService.addToCart(req.user.id, product_id, qty_kg);
  res.status(201).json(ApiResponse.created(data, 'Produk ditambahkan ke cart'));
});

const updateCartQty = asyncHandler(async (req, res) => {
  const { qty_kg } = req.body;
  const data = await OrdersService.updateCartQty(req.user.id, req.params.productId, qty_kg);
  res.json(ApiResponse.success(data, 'Qty berhasil diperbarui'));
});

const removeFromCart = asyncHandler(async (req, res) => {
  await OrdersService.removeFromCart(req.user.id, req.params.productId);
  res.json(ApiResponse.success(null, 'Item dihapus dari cart'));
});


// ─── Orders ──────────────────────────────────────────────────────

const getAll = asyncHandler(async (req, res) => {
  const data = await OrdersService.getAll(req.user.id);
  res.json(ApiResponse.success(data));
});

const getById = asyncHandler(async (req, res) => {
  const data = await OrdersService.getById(req.params.id, req.user.id);
  res.json(ApiResponse.success(data));
});

const createOrder = asyncHandler(async (req, res) => {
  const data = await OrdersService.createOrderFromCart(req.user.id, req.body);
  res.status(201).json(ApiResponse.created(data, 'Pesanan berhasil dibuat'));
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const data = await OrdersService.updateStatus(req.params.id, status, req.user.id);
  res.json(ApiResponse.success(data, 'Status pesanan diperbarui'));
});

module.exports = {
  getCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  getAll,
  getById,
  createOrder,
  updateStatus,
};
