import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "http";
import authRoutes from "../src/routes/auth.js";
import friendRoutes from "../src/routes/friends.js";
import adminRoutes from "../src/routes/admin.js";
import { errorHandler } from "../src/middleware/errorMiddleware.js";
import * as authService from "../src/services/authService.js";

function startTestApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/friends", friendRoutes);
    app.use("/api/admin", adminRoutes);
    app.use(errorHandler);

    const server = http.createServer(app);
    return new Promise((resolve) => {
        server.listen(0, () => {
            const port = server.address().port;
            resolve({
                port,
                url: `http://127.0.0.1:${port}/api`,
                close: () => new Promise((res) => server.close(res))
            });
        });
    });
}

test("E2E Integration - Friend search and Admin dashboard via HTTP API", async (t) => {
    await authService.ensureAdminAccount();
    const app = await startTestApp();

    t.after(async () => {
        await app.close();
    });

    // 1. Regular user registration
    const userRes = await fetch(`${app.url}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `e2e-${Date.now()}@example.com`,
            password: "test-password", confirmPassword: "test-password",
            name: "Lữ Khách Thường",
            avatar: "https://example.com/avatar.jpg"
        })
    });
    assert.equal(userRes.status, 200, "Regular user Google login should succeed");
    const userData = await userRes.json();
    assert.ok(userData.token, "Should return JWT token");
    assert.equal(userData.user.role, 0, "Regular user should have role 0");

    // 2. Regular user searches friends using their token
    const searchRes = await fetch(`${app.url}/friends/search?q=an`, {
        headers: { "Authorization": `Bearer ${userData.token}` }
    });
    assert.equal(searchRes.status, 200, "Search friends should return 200 OK");
    const searchResults = await searchRes.json();
    assert.ok(Array.isArray(searchResults), "Search results must be an array");
    assert.ok(searchResults.length > 0, "Should find matching users");
    const foundAn = searchResults.find(u => u.name.toLowerCase().includes("an") || u.email.includes("an"));
    assert.ok(foundAn, "Should find 'an' user");

    // 3. Regular user searches with 1-letter query "l"
    const searchShortRes = await fetch(`${app.url}/friends/search?q=l`, {
        headers: { "Authorization": `Bearer ${userData.token}` }
    });
    assert.equal(searchShortRes.status, 200, "1-letter search should return 200 OK");
    const shortResults = await searchShortRes.json();
    assert.ok(Array.isArray(shortResults), "Results must be an array");

    // 4. Regular user tries to access Admin stats -> Expect 403 Forbidden
    const forbiddenRes = await fetch(`${app.url}/admin/stats`, {
        headers: { "Authorization": `Bearer ${userData.token}` }
    });
    assert.equal(forbiddenRes.status, 403, "Regular user must be forbidden from admin routes");

    // 5. Admin login with email & password
    const adminLoginRes = await fetch(`${app.url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "admin@plantravel.com",
            password: "admin123456"
        })
    });
    assert.equal(adminLoginRes.status, 200, "Admin login should succeed");
    const adminData = await adminLoginRes.json();
    assert.ok(adminData.token, "Admin must receive token");
    assert.equal(adminData.user.role, 1, "Admin role must be 1");

    // 6. Admin accesses /admin/stats -> Expect 200 OK with valid stats
    const statsRes = await fetch(`${app.url}/admin/stats`, {
        headers: { "Authorization": `Bearer ${adminData.token}` }
    });
    assert.equal(statsRes.status, 200, "Admin must be able to access stats");
    const stats = await statsRes.json();
    assert.ok(typeof stats.totalUsers === "number", "stats.totalUsers must be number");
    assert.ok(typeof stats.totalPlans === "number", "stats.totalPlans must be number");
    assert.ok(Array.isArray(stats.hotLocations), "stats.hotLocations must be array");

    // 7. Admin accesses /admin/users -> Expect 200 OK with user list
    const usersRes = await fetch(`${app.url}/admin/users`, {
        headers: { "Authorization": `Bearer ${adminData.token}` }
    });
    assert.equal(usersRes.status, 200, "Admin must be able to list users");
    const userList = await usersRes.json();
    assert.ok(Array.isArray(userList), "userList must be array");
    assert.ok(userList.length > 0, "userList must contain users");
});
