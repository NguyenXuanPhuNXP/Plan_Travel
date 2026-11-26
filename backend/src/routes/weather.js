import express from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { fail } from '../services/mobileInput.js';

export function weatherRouter(client = axios) {
    const router = express.Router();
    router.get('/', rateLimit({ limit: 60, windowMs: 60000 }), asyncHandler(async (req, res) => {
        const { lat, lon } = req.query;
        if (typeof lat !== 'string' || !lat.trim() || typeof lon !== 'string' || !lon.trim() ||
            !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) ||
            Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) fail(400, 'INVALID_COORDINATES', 'Tọa độ không hợp lệ.');
        try {
            const { data } = await client.get(`${process.env.PYTHON_AI_URL || 'http://localhost:8001'}/api/weather`, { params: { lat, lon }, timeout: 12000 });
            res.json(data);
        } catch (error) {
            if (error.response?.status === 400) fail(400, 'UNSUPPORTED_LOCATION', 'Chỉ hỗ trợ thời tiết tại Việt Nam.');
            fail(503, 'WEATHER_UNAVAILABLE', 'Chưa lấy được thời tiết. Hãy thử lại sau.');
        }
    }));
    return router;
}
export default weatherRouter();
