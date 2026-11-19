import "../config/env.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Tạo Access Token (JWT) cho user
 * Tương đương JwtTokenService.GenerateAccessToken trong C#
 */
export function generateAccessToken(user) {
    const secret = getJwtSecret();
    const issuer = process.env.JWT_ISSUER || "TravelPlannerAPI";
    const audience = process.env.JWT_AUDIENCE || "TravelPlannerClient";
    const expiryMinutes = parseInt(process.env.ACCESS_TOKEN_EXPIRY_MINUTES || "60", 10);

    const payload = {
        sub: user.id.toString(),
        email: user.email,
        role: user.role,
        jti: crypto.randomUUID()
    };

    return jwt.sign(payload, secret, {
        issuer,
        audience,
        expiresIn: `${expiryMinutes}m`
    });
}

/**
 * Tạo Refresh Token (random bytes)
 * Tương đương JwtTokenService.GenerateRefreshToken trong C#
 */
export function generateRefreshToken() {
    return crypto.randomBytes(32).toString("base64");
}

/**
 * Verify và decode Access Token
 */
export function verifyAccessToken(token) {
    const secret = getJwtSecret();
    const issuer = process.env.JWT_ISSUER || "TravelPlannerAPI";
    const audience = process.env.JWT_AUDIENCE || "TravelPlannerClient";

    return jwt.verify(token, secret, { issuer, audience });
}

/**
 * Hash token bằng SHA256 (tương thích với C# HashToken)
 */
export function hashToken(token) {
    return crypto.createHash("sha256").update(token, "utf8").digest("base64");
}

function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error("Missing JWT_SECRET environment variable.");
    }

    return process.env.JWT_SECRET;
}
