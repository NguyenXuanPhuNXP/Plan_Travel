import { verifyAccessToken } from "../services/jwtService.js";
import prisma from '../config/db.js';

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token không hợp lệ." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try { decoded = verifyAccessToken(token); }
    catch { return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' }); }
    try {
        const user = await prisma.users.findUnique({ where: { id: BigInt(decoded.sub) }, select: { id: true, email: true, role: true, is_active: true } });
        if (!user?.is_active) return res.status(401).json({ message: 'Tài khoản không còn hoạt động.' });
        req.user = { id: String(user.id), email: user.email, role: user.role };
        next();
    } catch (err) {
        next(err);
    }
}

// Role checks always use req.user.role populated from the database by authenticate.
// Never accept a role supplied by the client.
export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Token không hợp lệ.' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bạn không có quyền thực hiện chức năng này.' });
        }
        next();
    };
}

export const userOnly = requireRoles('user');
export const businessOnly = requireRoles('business');

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
