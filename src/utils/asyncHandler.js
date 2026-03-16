/**
 * Wrapper untuk async route handler agar tidak perlu try/catch berulang.
 * Error otomatis diteruskan ke global error handler via next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
