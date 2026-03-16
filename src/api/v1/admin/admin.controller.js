const asyncHandler = require('../../../utils/asyncHandler');
const AdminService = require('./admin.service');
const ApiResponse = require('../../../utils/ApiResponse');

const getSummary      = asyncHandler(async (req, res) => {
  const data = await AdminService.getSummary();
  res.json(ApiResponse.success(data));
});

// ─── Users ────────────────────────────────────────────────────────
const getAllUsers      = asyncHandler(async (req, res) => {
  const data = await AdminService.getAllUsers(req.query);
  res.json(ApiResponse.success(data));
});

const updateUserRole  = asyncHandler(async (req, res) => {
  const data = await AdminService.updateUserRole(req.params.id, req.body.role);
  res.json(ApiResponse.success(data, 'Role user berhasil diperbarui'));
});

// ─── Products ─────────────────────────────────────────────────────
const getAllProducts   = asyncHandler(async (req, res) => {
  const data = await AdminService.getAllProducts(req.query);
  res.json(ApiResponse.success(data));
});

const createProduct   = asyncHandler(async (req, res) => {
  const data = await AdminService.createProduct(req.body, req.user.id);
  res.status(201).json(ApiResponse.created(data, 'Produk berhasil ditambahkan'));
});

const updateProduct   = asyncHandler(async (req, res) => {
  const data = await AdminService.updateProduct(req.params.id, req.body);
  res.json(ApiResponse.success(data, 'Produk berhasil diperbarui'));
});

const deleteProduct   = asyncHandler(async (req, res) => {
  await AdminService.deleteProduct(req.params.id);
  res.json(ApiResponse.success(null, 'Produk berhasil dinonaktifkan'));
});

// ─── Orders ───────────────────────────────────────────────────────
const getAllOrders     = asyncHandler(async (req, res) => {
  const data = await AdminService.getAllOrders(req.query);
  res.json(ApiResponse.success(data));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const data = await AdminService.updateOrderStatus(req.params.id, req.body.status);
  res.json(ApiResponse.success(data, 'Status pesanan diperbarui'));
});

// ─── Payments ─────────────────────────────────────────────────────
const verifyPayment   = asyncHandler(async (req, res) => {
  const data = await AdminService.verifyPayment(req.params.id, req.body.status);
  res.json(ApiResponse.success(data, 'Pembayaran diverifikasi'));
});

const uploadProductImages = asyncHandler(async (req, res) => {
  const urls = await AdminService.uploadProductImages(req.files);
  res.json(ApiResponse.success({ urls }, `${urls.length} foto berhasil diupload`));
});

module.exports = {
  getSummary,
  getAllUsers, updateUserRole,
  getAllProducts, createProduct, updateProduct, deleteProduct,
  getAllOrders, updateOrderStatus,
  verifyPayment,
  uploadProductImages,
};
