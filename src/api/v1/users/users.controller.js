const asyncHandler = require('../../../utils/asyncHandler');
const UsersService = require('./users.service');
const ApiResponse = require('../../../utils/ApiResponse');

const getMe = asyncHandler(async (req, res) => {
  const data = await UsersService.getById(req.user.id);
  res.json(ApiResponse.success(data));
});

const updateMe = asyncHandler(async (req, res) => {
  const data = await UsersService.update(req.user.id, req.body);
  res.json(ApiResponse.success(data, 'Profil berhasil diperbarui'));
});

module.exports = { getMe, updateMe };
