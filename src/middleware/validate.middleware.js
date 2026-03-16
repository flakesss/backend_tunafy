const ApiError = require('../utils/ApiError');

/**
 * Middleware validasi request body menggunakan Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema untuk validasi
 * 
 * Penggunaan: router.post('/', validate(loginSchema), controller)
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw ApiError.badRequest('Validasi gagal', errors);
  }

  req.body = result.data; // gunakan data yang sudah divalidasi
  next();
};

module.exports = { validate };
