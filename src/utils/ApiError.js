class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    this.data = null;
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Akses tidak diizinkan') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Anda tidak memiliki izin') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Data tidak ditemukan') {
    return new ApiError(404, message);
  }

  static internal(message = 'Terjadi kesalahan pada server') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
