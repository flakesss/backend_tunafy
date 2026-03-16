const asyncHandler = require('../../../utils/asyncHandler');
const AuthService = require('./auth.service');
const ApiResponse = require('../../../utils/ApiResponse');

const register = asyncHandler(async (req, res) => {
  const data = await AuthService.register(req.body);
  res.status(201).json(ApiResponse.created(data, 'Registrasi berhasil. Silakan cek email untuk konfirmasi.'));
});

const login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  res.json(ApiResponse.success(data, 'Login berhasil'));
});

const logout = asyncHandler(async (req, res) => {
  await AuthService.logout(req.headers.authorization?.split(' ')[1]);
  res.json(ApiResponse.success(null, 'Logout berhasil'));
});

const refresh = asyncHandler(async (req, res) => {
  const data = await AuthService.refresh(req.body.refresh_token);
  res.json(ApiResponse.success(data, 'Token diperbarui'));
});

const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.json(ApiResponse.success({ available: false }, 'Username wajib diisi'));
  }
  const result = await AuthService.checkUsernameAvailability(username);
  res.json(ApiResponse.success(result));
});

const oauthCallback = asyncHandler(async (req, res) => {
  const { user } = req.body;
  if (!user) {
    return res.status(400).json(ApiResponse.error('Data user wajib dikirim'));
  }
  const data = await AuthService.oauthCallback({ user });
  res.json(ApiResponse.success(data, data.isNewUser ? 'Profil Google berhasil dibuat' : 'Login Google berhasil'));
});

module.exports = { register, login, logout, refresh, checkUsername, oauthCallback };
