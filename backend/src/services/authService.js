import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} from "./jwtService.js";

/**
 * Đăng ký user mới
 * Tương đương AuthService.RegisterAsync trong C#
 */
export async function register(dto) {
    const fullName = String(dto.fullName || dto.name || "").trim();
    const email = String(dto.email || "").trim().toLowerCase();
    const phone = dto.phone ? String(dto.phone).trim() : null;
    const password = String(dto.password || "");
    const confirmPassword = String(dto.confirmPassword || "");

    if (!fullName) {
        throw { status: 400, message: "Họ và tên là bắt buộc." };
    }
    if (!email) {
        throw { status: 400, message: "Email là bắt buộc." };
    }
    if (password.length < 6) {
        throw { status: 400, message: "Mật khẩu cần ít nhất 6 ký tự." };
    }
    if (password !== confirmPassword) {
        throw { status: 400, message: "Mật khẩu xác nhận không khớp." };
    }

    const existingEmail = await prisma.users.findUnique({ where: { email } });
    if (existingEmail) {
        throw { status: 400, message: "Email này đã được sử dụng." };
    }

    if (phone) {
        const existingPhone = await prisma.users.findUnique({ where: { phone } });
        if (existingPhone) {
            throw { status: 400, message: "Số điện thoại này đã được sử dụng." };
        }
    }

    const passwordHash = await bcrypt.hash(password, 10);


    const user = await prisma.users.create({
        data: {
            full_name: fullName,
            email,
            phone: phone || null,
            password_hash: passwordHash,
            role: "user",
            is_active: true
        }
    });

    return await createAuthResponse(user);
}

/**
 * Đăng nhập
 * Tương đương AuthService.LoginAsync trong C#
 */
export async function login(dto) {
    const email = String(dto.email || "").trim().toLowerCase();
    const password = String(dto.password || "");

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
        throw { status: 401, message: "Email hoặc mật khẩu không chính xác." };
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        throw { status: 401, message: "Email hoặc mật khẩu không chính xác." };
    }

    if (!user.is_active) {
        throw { status: 401, message: "Tài khoản của bạn đã bị vô hiệu hóa." };
    }

    return await createAuthResponse(user);
}

/**
 * Refresh token
 * Tương đương AuthService.RefreshTokenAsync trong C#
 */
export async function refreshToken(refreshTokenValue) {
    const tokenHash = hashToken(refreshTokenValue);

    const savedToken = await prisma.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
        include: { users: true }
    });

    if (
        !savedToken ||
        savedToken.revoked_at !== null ||
        savedToken.expires_at <= new Date() ||
        !savedToken.users.is_active
    ) {
        throw { status: 401, message: "Refresh token không hợp lệ hoặc đã hết hạn." };
    }

    // Revoke token hiện tại
    await prisma.refresh_tokens.update({
        where: { id: savedToken.id },
        data: { revoked_at: new Date() }
    });

    return await createAuthResponse(savedToken.users);
}

/**
 * Đăng xuất - revoke refresh token
 * Tương đương AuthService.LogoutAsync trong C#
 */
export async function logout(refreshTokenValue) {
    const tokenHash = hashToken(refreshTokenValue);

    const savedToken = await prisma.refresh_tokens.findUnique({
        where: { token_hash: tokenHash }
    });

    if (savedToken && savedToken.revoked_at === null) {
        await prisma.refresh_tokens.update({
            where: { id: savedToken.id },
            data: { revoked_at: new Date() }
        });
    }
}

/**
 * Lấy profile user
 * Tương đương AuthService.GetUserProfileAsync trong C#
 */
export async function getUserProfile(userId) {
    const user = await prisma.users.findUnique({
        where: { id: BigInt(userId) }
    });

    if (!user) return null;

    return buildUserProfile(user);
}

export async function updateUserProfile(userId, dto) {
    const fullName = String(dto.fullName || "").trim();
    const email = String(dto.email || "").trim().toLowerCase();
    const phone = String(dto.phone || "").trim() || null;
    const avatarUrl = String(dto.avatarUrl || "").trim() || null;

    if (!fullName || !email) {
        throw { status: 400, message: "Tên hiển thị và email là bắt buộc." };
    }

    const duplicateEmail = await prisma.users.findFirst({
        where: {
            email,
            NOT: { id: BigInt(userId) }
        }
    });
    if (duplicateEmail) {
        throw { status: 400, message: "Email này đã được sử dụng." };
    }

    if (phone) {
        const duplicatePhone = await prisma.users.findFirst({
            where: {
                phone,
                NOT: { id: BigInt(userId) }
            }
        });
        if (duplicatePhone) {
            throw { status: 400, message: "Số điện thoại này đã được sử dụng." };
        }
    }

    const updated = await prisma.users.update({
        where: { id: BigInt(userId) },
        data: {
            full_name: fullName,
            email,
            phone,
            avatar_url: avatarUrl,
            updated_at: new Date()
        }
    });

    return buildUserProfile(updated);
}

export async function changePassword(userId, dto) {
    const currentPassword = String(dto.currentPassword || "");
    const newPassword = String(dto.newPassword || "");
    const confirmPassword = String(dto.confirmPassword || "");

    if (!currentPassword || newPassword.length < 6) {
        throw { status: 400, message: "Mật khẩu mới cần ít nhất 6 ký tự." };
    }
    if (newPassword !== confirmPassword) {
        throw { status: 400, message: "Mật khẩu xác nhận không khớp." };
    }

    const user = await prisma.users.findUnique({ where: { id: BigInt(userId) } });
    if (!user || !user.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
        throw { status: 400, message: "Mật khẩu hiện tại không đúng." };
    }

    await prisma.users.update({
        where: { id: BigInt(userId) },
        data: {
            password_hash: await bcrypt.hash(newPassword, 10),
            updated_at: new Date()
        }
    });

    return { message: "Đổi mật khẩu thành công." };
}

// ===== HELPERS =====

export async function createAuthResponse(user) {
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(newRefreshToken);

    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || "7", 10);

    await prisma.refresh_tokens.create({
        data: {
            user_id: user.id,
            token_hash: refreshTokenHash,
            expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
        }
    });

    return {
        token: accessToken,
        refreshToken: newRefreshToken,
        user: buildUserProfile(user)
    };
}

function buildUserProfile(user) {
    return {
        id: Number(user.id),
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || null,
        avatarUrl: user.avatar_url || null,
        role: user.role === "admin" ? 1 : 0
    };
}


/**
 * Đăng nhập / đăng ký qua Google
 */
export async function loginWithGoogle(dto) {
    const idToken = dto.credential || dto.idToken;
    if (!idToken || String(idToken).startsWith('mock-')) {
        throw { status: 401, message: 'Google ID token is required.' };
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw { status: 503, message: 'Google sign-in is not configured.' };
    }
    let payload;
    try {
        const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({
            idToken, audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
        if (!payload?.email_verified || !payload.email) throw new Error('Unverified email');
    } catch {
        throw { status: 401, message: 'Invalid Google ID token.' };
    }
    const email = payload.email.trim().toLowerCase();
    const fullName = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || null;

    let user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
        const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = await prisma.users.create({
            data: {
                full_name: fullName,
                email,
                phone: null,
                password_hash: dummyPassword,
                role: "user",
                avatar_url: avatarUrl,
                is_active: true
            }
        });
    }

    if (!user.is_active) {
        throw { status: 401, message: "Tài khoản của bạn đã bị vô hiệu hóa." };
    }

    return await createAuthResponse(user);
}

/**
 * Đảm bảo tài khoản admin mặc định tồn tại trong hệ thống
 */
export async function ensureAdminAccount() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) return;
        const existingAdmin = await prisma.users.findUnique({
            where: { email: adminEmail }
        });

        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            await prisma.users.create({
                data: {
                    full_name: "Quản Trị Viên",
                    email: adminEmail,
                    phone: "0900000000",
                    password_hash: passwordHash,
                    role: "admin",
                    is_active: true,
                    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                }
            });
            console.log("Admin account initialized.");
        }
    } catch (err) {
        console.warn("⚠️ Không thể kết nối DB để kiểm tra tài khoản Admin mặc định:", err.message);
    }
}
