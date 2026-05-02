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
    const { fullName, email, phone, password, confirmPassword } = dto;

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
    const { email, password } = dto;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
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
        savedToken.expires_at <= new Date()
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

// ===== HELPERS =====

async function createAuthResponse(user) {
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
