const asyncHandler = require('../../../utils/asyncHandler');
const ShippingService = require('./shipping.service');
const ApiResponse = require('../../../utils/ApiResponse');

const getAddresses = asyncHandler(async (req, res) => {
  const data = await ShippingService.getAddresses(req.user.id);
  res.json(ApiResponse.success(data));
});

const addAddress = asyncHandler(async (req, res) => {
  const data = await ShippingService.addAddress(req.body, req.user.id);
  res.status(201).json(ApiResponse.created(data, 'Alamat berhasil ditambahkan'));
});

const removeAddress = asyncHandler(async (req, res) => {
  await ShippingService.removeAddress(req.params.id, req.user.id);
  res.json(ApiResponse.success(null, 'Alamat berhasil dihapus'));
});

module.exports = { getAddresses, addAddress, removeAddress };
