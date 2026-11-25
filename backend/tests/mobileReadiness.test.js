import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTransition, locationInput } from '../src/services/executionService.js';
import { pageInput, idOf } from '../src/services/mobileInput.js';
import { generateLocationToken, verifyLocationToken, verifyAccessToken } from '../src/services/jwtService.js';
import { rateLimit } from '../src/middleware/rateLimit.js';

test('Execution transitions require arrival and keep terminal stops terminal', () => {
    for (const [from, to] of [['pending', 'arrived'], ['pending', 'skipped'], ['arrived', 'completed'], ['arrived', 'skipped'], ['completed', 'completed']]) {
        assert.doesNotThrow(() => checkTransition(from, to));
    }
    for (const [from, to] of [['pending', 'completed'], ['completed', 'arrived'], ['skipped', 'completed']]) assert.throws(() => checkTransition(from, to), error => error.status === 409);
    assert.throws(() => checkTransition('pending', 'whatever'), error => error.status === 400);
});

test('Location samples reject malformed coordinates and bad timestamps', () => {
    const now = Date.now();
    const sample = { latitude: 21, longitude: 105, accuracyMeters: 12, capturedAt: new Date(now).toISOString(), sharingVersion: 1 };
    assert.equal(locationInput(sample, now).latitude, 21);
    for (const change of [{ latitude: null }, { latitude: 91 }, { longitude: '105' }, { accuracyMeters: 0 }, { accuracyMeters: Infinity }, { sharingVersion: -1 }, { capturedAt: new Date(now - 120001).toISOString() }, { capturedAt: new Date(now + 10001).toISOString() }]) {
        assert.throws(() => locationInput({ ...sample, ...change }, now), error => error.status === 400);
    }
});

test('Pagination and IDs reject fractional limits, malformed cursors and bigint overflow', () => {
    assert.deepEqual(pageInput({ limit: 20, cursor: '999' }), { take: 20, before: 999n });
    for (const query of [{ limit: 101 }, { limit: 1.2 }, { cursor: '-1' }, { cursor: ['2', '3'] }]) assert.throws(() => pageInput(query));
    assert.throws(() => idOf('18446744073709551616'));
});

test('Location capability cannot authenticate as an ordinary access token', () => {
    process.env.JWT_SECRET = 'mobile-unit-test-secret';
    const token = generateLocationToken('12', '34', 5);
    const claims = verifyLocationToken(token);
    assert.equal(claims.sub, '12'); assert.equal(claims.executionId, '34'); assert.equal(claims.sharingVersion, 5);
    assert.throws(() => verifyAccessToken(token));
});

test('Rate limit is isolated per authenticated account and returns Retry-After', () => {
    const handler = rateLimit({ limit: 1, windowMs: 60000 });
    let passes = 0, status, retry;
    const res = { set: (_key, value) => { retry = value; }, status: value => { status = value; return res; }, json: () => {} };
    handler({ user: { id: '1' } }, res, () => passes++);
    handler({ user: { id: '1' } }, res, () => passes++);
    handler({ user: { id: '2' } }, res, () => passes++);
    assert.equal(passes, 2); assert.equal(status, 429); assert.equal(retry, '60');
});
