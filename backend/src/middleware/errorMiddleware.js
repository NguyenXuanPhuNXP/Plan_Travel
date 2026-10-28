export function notFoundHandler(req, res, next) {
    next({ status: 404, message: `Không tìm thấy route ${req.method} ${req.originalUrl}.` });
}

export function errorHandler(error, _req, res, _next) {
    const status = error.status || 500;

    res.status(status).json({
        message: error.message || "Lỗi máy chủ.",
        details: error.details
    });
}
