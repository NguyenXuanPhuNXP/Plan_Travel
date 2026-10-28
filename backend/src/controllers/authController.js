import * as authService from "../services/authService.js";

export async function register(req, res) {
    const response = await authService.register(req.body);
    res.status(200).json(response);
}

export async function login(req, res) {
    const response = await authService.login(req.body);
    res.status(200).json(response);
}

export async function refreshToken(req, res) {
    if (!req.body.refreshToken) {
        throw { status: 400, message: "Thiếu refresh token." };
    }

    const response = await authService.refreshToken(req.body.refreshToken);
    res.status(200).json(response);
}

export async function logout(req, res) {
    if (!req.body.refreshToken) {
        throw { status: 400, message: "Thiếu refresh token." };
    }

    await authService.logout(req.body.refreshToken);
    res.status(200).json({ message: "Đăng xuất thành công." });
}

export async function getMe(req, res) {
    const userProfile = await authService.getUserProfile(req.user.id);

    if (!userProfile) {
        throw { status: 404, message: "Không tìm thấy người dùng." };
    }

    res.status(200).json(userProfile);
}

export async function updateProfile(req, res) {
    const response = await authService.updateUserProfile(req.user.id, req.body);
    res.status(200).json(response);
}

export async function changePassword(req, res) {
    const response = await authService.changePassword(req.user.id, req.body);
    res.status(200).json(response);
}
