import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/db.js";
import * as authService from "../src/services/authService.js";
import * as friendService from "../src/services/friendService.js";
import { verifyAccessToken } from "../src/services/jwtService.js";

test("Friend Search - Search by name and email fragment returns matching users", async () => {
    const users = await friendService.searchUsers("1", "an");
    assert.ok(Array.isArray(users), "Result should be an array");
    assert.ok(users.length > 0, "Should find at least one user with 'an'");
    
    const found = users.find(u => u.email.includes("an.nguyen") || u.name.toLowerCase().includes("an"));
    assert.ok(found, "Should find Nguyễn Văn An");
    assert.ok(found.id, "Found user must have an id");
    assert.ok(found.name, "Found user must have a name");
    assert.notEqual(found.id, "1", "Should not include requester themselves");
});

test("Friend Search - 1-letter search query works responsively", async () => {
    const results = await friendService.searchUsers("1", "a");
    assert.ok(Array.isArray(results), "Result should be an array");
    assert.ok(results.length > 0, "Should return results for 1-letter search");
});

test("Admin - Default admin user exists and can authenticate", async () => {
    await authService.ensureAdminAccount();

    const adminUser = await prisma.users.findUnique({
        where: { email: "admin@plantravel.com" }
    });
    assert.ok(adminUser, "admin@plantravel.com must exist in database");
    assert.equal(adminUser.role, "admin", "User role must be admin");

    const authRes = await authService.login({
        email: "admin@plantravel.com",
        password: "admin123456"
    });
    assert.ok(authRes.token, "Must return access token");
    assert.equal(authRes.user.role, 1, "Admin user role in profile must be 1");

    const decoded = verifyAccessToken(authRes.token);
    assert.equal(decoded.role, "admin", "JWT role must be admin");
});

test("Google Auth rejects email-only impersonation and mock tokens", async () => {
  for (const dto of [{email:'admin@plantravel.com',role:'admin'}, {idToken:'mock-google-token-123'}]) {
    await assert.rejects(() => authService.loginWithGoogle(dto), err => err.status === 401);
  }
});

test("Registration never grants admin based on email or supplied role", async () => {
  const email = 'admin@security-' + Date.now() + '.example';
  let id;
  try {
    const result = await authService.register({name:'Security test',email,password:'test-password',confirmPassword:'test-password',role:'admin'});
    id = BigInt(result.user.id);
    assert.equal(result.user.role, 0);
    assert.equal(verifyAccessToken(result.token).role, 'user');
  } finally {
    if (id) { await prisma.refresh_tokens.deleteMany({where:{user_id:id}}); await prisma.users.delete({where:{id}}); }
  }
});
