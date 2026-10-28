import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { createGoogleAuth } from '../src/services/googleAuthService.js';

process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.JWT_SECRET = 'google-test-secret-only';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const verifier = new OAuth2Client();
const certs = { test: publicKey.export({ type: 'spki', format: 'pem' }) };

function fixture(existing = []) {
  const users = new Map(existing.map(user => [user.id, { ...user }]));
  const identities = new Map();
  let ddlCalls = 0;
  let sessions = 0;
  const tx = {
    users: {
      findUnique: async ({ where }) => where.id ? users.get(where.id) : [...users.values()].find(u => u.email === where.email),
      create: async ({ data }) => {
        const user = { ...data, id: BigInt(users.size + 1) };
        users.set(user.id, user);
        return user;
      }
    },
    $queryRaw: async (strings, key) => strings.join('').includes('WHERE google_sub')
      ? (identities.has(key) ? [{ user_id: identities.get(key) }] : [])
      : [...identities].filter(([, id]) => id === key).map(([sub]) => ({ google_sub: sub })),
    $executeRaw: async (_strings, sub, id) => { identities.set(sub, id); }
  };
  const prisma = {
    $executeRawUnsafe: async () => { ddlCalls++; },
    $transaction: async callback => callback(tx)
  };
  const auth = createGoogleAuth({
    prisma,
    createSession: async user => { sessions++; return { token: 'app-access', refreshToken: 'app-refresh', user }; },
    verifyIdToken: ({ idToken, audience }) => verifier.verifySignedJwtWithCertsAsync(idToken, certs, audience)
  });
  const credentials = (overrides = {}, options = {}) => {
    const { nonce, nonceToken } = auth.challenge();
    const payload = {
      iss: 'https://accounts.google.com', aud: process.env.GOOGLE_CLIENT_ID,
      sub: 'google-sub-1', email: 'traveler@gmail.com', email_verified: true,
      name: 'Traveler', nonce, ...overrides
    };
    const credential = jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: 'test', expiresIn: '1h', ...options });
    return { credential, nonceToken };
  };
  return { auth, credentials, users, identities, counts: () => ({ ddlCalls, sessions }) };
}

test('verified Google sign-in creates a normal user and reuses stable Google sub', async () => {
  const f = fixture();
  const first = await f.auth.login(f.credentials());
  assert.equal(first.user.role, 'user');
  assert.equal(first.user.password_hash, null);
  assert.equal(first.token, 'app-access');
  const second = await f.auth.login(f.credentials({ email: 'changed@gmail.com' }));
  assert.equal(first.user.id, second.user.id);
  assert.equal(f.users.size, 1);
  assert.equal(f.counts().ddlCalls, 1);
});

test('linking authoritative email preserves password, role and profile', async () => {
  const account = { id: 1n, email: 'traveler@gmail.com', full_name: 'Existing', password_hash: 'existing-hash', role: 'admin', is_active: true };
  const f = fixture([account]);
  const result = await f.auth.login(f.credentials());
  assert.deepEqual(result.user, account);
  assert.equal(f.identities.get('google-sub-1'), 1n);
});

for (const [name, payload, options] of [
  ['wrong audience', { aud: 'another-client' }],
  ['wrong issuer', { iss: 'https://attacker.example' }],
  ['expired token', { iat: Math.floor(Date.now() / 1000) - 7200 }, { expiresIn: '1s' }],
  ['unverified email', { email_verified: false }],
  ['nonce mismatch', { nonce: 'attacker-nonce' }]
]) {
  test(`rejects ${name} before any DB/session writes`, async () => {
    const f = fixture();
    await assert.rejects(f.auth.login(f.credentials(payload, options)), error => error.status === 401);
    assert.deepEqual(f.counts(), { ddlCalls: 0, sessions: 0 });
    assert.equal(f.users.size, 0);
  });
}

test('rejects forged token and tampered challenge', async () => {
  const f = fixture();
  const data = f.credentials();
  await assert.rejects(f.auth.login({ ...data, credential: 'mock-google-token' }), e => e.status === 401);
  await assert.rejects(f.auth.login({ ...data, nonceToken: 'forged' }), e => e.status === 401);
});

test('disabled accounts cannot receive a session', async () => {
  const f = fixture([{ id: 1n, email: 'traveler@gmail.com', is_active: false }]);
  await assert.rejects(f.auth.login(f.credentials()), e => e.status === 401);
  assert.equal(f.counts().sessions, 0);
});

test('does not auto-link an external email or overwrite a different Google identity', async () => {
  const f = fixture([{ id: 1n, email: 'traveler@example.com', is_active: true }]);
  await assert.rejects(f.auth.login(f.credentials({ email: 'traveler@example.com' })), e => e.status === 409);
  assert.equal(f.identities.size, 0);
  const linked = fixture([{ id: 1n, email: 'traveler@gmail.com', is_active: true }]);
  linked.identities.set('other-google-sub', 1n);
  await assert.rejects(linked.auth.login(linked.credentials()), e => e.status === 409);
  assert.equal(linked.counts().sessions, 0);
});

test('missing configuration fails closed', () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  try { assert.throws(() => fixture().auth.challenge(), error => error.status === 503); }
  finally { process.env.GOOGLE_CLIENT_ID = old; }
});
