export function notFoundHandler(req, res, next) {
    next({ status: 404, message: `Không tìm thấy route ${req.method} ${req.originalUrl}.` });
}

export function errorHandler(error, _req, res, _next) {
    const status = error.status || 500;

    res.status(status).json({
        code: error.code || ({ 400: 'INVALID_INPUT', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' }[status]) || 'INTERNAL_ERROR',
        message: error.message || "Lỗi máy chủ.",
        details: error.details
    });
}
