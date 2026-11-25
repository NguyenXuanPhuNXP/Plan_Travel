import prisma from '../config/db.js';

export async function adminOnly(req, res, next) {
    try {
        const user = req.user?.id ? await prisma.users.findUnique({ where: { id: BigInt(req.user.id) }, select: { role: true, is_active: true } }) : null;
        if (!user?.is_active || user.role !== 'admin') {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập admin.' });
        }
        next();
    } catch (error) { next(error); }
}
