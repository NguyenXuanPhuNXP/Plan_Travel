import { verifyAccessToken } from "../services/jwtService.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token không hợp lệ." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
}

/**
 * Optional auth - nếu có token hợp lệ thì decode, không có thì bỏ qua
 * Dùng cho routes public nhưng cần biết user nếu đã đăng nhập
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
    } catch (err) {
        req.user = null;
    }
    next();
}
