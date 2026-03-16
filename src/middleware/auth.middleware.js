const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware autentikasi — verifikasi JWT Token dari Supabase Auth.
 * Token dikirim via header: Authorization: Bearer <token>
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Token autentikasi tidak ditemukan');
  }

  const token = authHeader.split(' ')[1];

  // Verifikasi token ke Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw ApiError.unauthorized('Token tidak valid atau sudah kadaluarsa');
  }

  req.user = user;
  next();
});

module.exports = { authenticate };
