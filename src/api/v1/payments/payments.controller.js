const asyncHandler = require('../../../utils/asyncHandler');
const PaymentsService = require('./payments.service');
const ApiResponse = require('../../../utils/ApiResponse');

const uploadProof = asyncHandler(async (req, res) => {
  const data = await PaymentsService.uploadProof(req.body, req.file, req.user.id);
  res.status(201).json(ApiResponse.created(data, 'Bukti pembayaran berhasil diunggah'));
});

const getByOrder = asyncHandler(async (req, res) => {
  const data = await PaymentsService.getByOrder(req.params.orderId);
  res.json(ApiResponse.success(data));
});

module.exports = { uploadProof, getByOrder };
