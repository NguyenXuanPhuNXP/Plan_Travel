import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/db.js";
import * as authService from "../src/services/authService.js";
import * as friendService from "../src/services/friendService.js";

test("Registration with 'name' field creates user in DB and is discoverable in friend search", async () => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await authService.register({
        name: "Người Dùng Mới Đăng Ký",
        email: uniqueEmail,
        password: "password123",
        confirmPassword: "password123"
    });

    assert.ok(regRes.user, "Must return registered user");
    assert.equal(regRes.user.fullName, "Người Dùng Mới Đăng Ký");
    assert.equal(regRes.user.email, uniqueEmail);

    // Verify in database
    const dbUser = await prisma.users.findUnique({ where: { email: uniqueEmail } });
    assert.ok(dbUser, "User must be persisted in database");
    assert.equal(dbUser.full_name, "Người Dùng Mới Đăng Ký");

    // Search from another user's perspective
    const searchResults = await friendService.searchUsers("1", "Mới Đăng Ký");
    assert.ok(searchResults.length > 0, "Should find newly registered user by search query");
    const found = searchResults.find(u => u.email === uniqueEmail);
    assert.ok(found, "Found user must match uniqueEmail");
    assert.equal(found.fullName, "Người Dùng Mới Đăng Ký");

    // Search without query (suggested users) should also list this newest user
    const suggested = await friendService.searchUsers("1", "");
    assert.ok(suggested.length > 0, "Should return suggested users");
    const foundInSuggested = suggested.find(u => u.email === uniqueEmail);
    assert.ok(foundInSuggested, "Newly registered user should be in suggested list");
});
