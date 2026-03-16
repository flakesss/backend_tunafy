const ApiError = require('../utils/ApiError');

/**
 * Middleware role-based access control.
 * @param  {...string} roles - Role yang diizinkan, misal: 'admin', 'seller'
 * 
 * Penggunaan: router.delete('/:id', authenticate, authorize('admin'), controller)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const userRole = req.user.user_metadata?.role;

    if (!roles.includes(userRole)) {
      throw ApiError.forbidden(
        `Role '${userRole}' tidak memiliki akses ke resource ini`
      );
    }

    next();
  };
};

module.exports = { authorize };
