import prisma from '../config/db.js';
import { sendNotificationEmail } from './emailService.js';

export async function createNotification({ db = prisma, userId, type, title, message, forceEmail = false }) {
    const notification = await db.user_notifications.create({ data: { user_id: userId, type, title, message } });
    // Keep notification creation compatible while an older Prisma Client is
    // still running before `prisma generate` has been executed.
    const user = await db.users.findUnique({ where: { id: userId }, select: { email: true } });
    // Email notifications are enabled by default, matching the frontend.
    let notifyByEmail = true;
    try {
        const preferences = await db.$queryRaw`SELECT notify_by_email FROM users WHERE id = ${userId} LIMIT 1`;
        notifyByEmail = Boolean(preferences[0]?.notify_by_email);
    } catch (error) {
        console.warn('Không đọc được tùy chọn email; dùng mặc định bật email. Cần chạy migration Prisma:', error.message);
    }
    if ((forceEmail || notifyByEmail) && user?.email) {
        // Gửi email im lặng để tránh làm nhiễu terminal khi xử lý notification.
        await sendNotificationEmail({ to: user.email, title, message }).catch(() => undefined);
    }
    return notification;
}

export async function createScheduleReminder({ userId, reminderKey, title, message }) {
    const type = `reminder:${String(reminderKey || '').slice(0, 40)}`;
    const existing = await prisma.user_notifications.findFirst({
        where: { user_id: BigInt(userId), type, title }
    });
    if (existing) return existing;
    return createNotification({ userId, type, title, message });
}
