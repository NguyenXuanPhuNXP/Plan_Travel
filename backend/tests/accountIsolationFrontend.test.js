import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

test('Switching accounts clears trips and notifications, including late responses and legacy caches', async () => {
    const old = { localStorage: globalThis.localStorage, fixture: globalThis.__accountFixture, flag: globalThis.IS_REACT_ACT_ENVIRONMENT, window: globalThis.window };
    const storage = new Map([['travel_trips', JSON.stringify([{ id: 'legacy-private' }])], ['travel_notifications', JSON.stringify([{ id: 'legacy-notification' }])]]);
    globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
    globalThis.window = new EventTarget();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let resolveOldTrips;
    let resolveOldNotifications;
    const fixture = globalThis.__accountFixture = {
        auth: { user: { id: 'A' }, loading: false },
        itineraryService: { getAll: () => new Promise(resolve => { resolveOldTrips = resolve; }) },
        friendService: { getNotifications: () => new Promise(resolve => { resolveOldNotifications = resolve; }) }
    };
    const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
    const load = async (name, replacements) => {
        let source = await readFile(new URL(`../../frontend/src/context/${name}.jsx`, import.meta.url), 'utf8');
        source = source.replace(/from 'react'/g, `from '${reactUrl}'`)
            .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => globalThis.__accountFixture.auth;');
        for (const [pattern, value] of replacements) source = source.replace(pattern, value);
        const { code } = await transform(`${name}.jsx`, source, { jsx: { runtime: 'classic' } });
        const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
        return { url, module: await import(url) };
    };
    let renderer;
    try {
        const trips = await load('TripContext', [[/import \{ itineraryService \} from '[^']+';/, 'const itineraryService = globalThis.__accountFixture.itineraryService;']]);
        const notifications = await load('NotificationContext', [
            [/import \{ useTrips \} from '[^']+';/, `import { useTrips } from '${trips.url}';`],
            [/import \{ friendService \} from '[^']+';/, 'const friendService = globalThis.__accountFixture.friendService;'],
            [/import \{ Bell, X \} from '[^']+';/, 'const Bell = () => null; const X = () => null;'],
            [/import '[^']+\.css';/, '']
        ]);
        let observed;
        function Probe() {
            observed = { ...trips.module.useTrips(), ...notifications.module.useNotifications() };
            return null;
        }
        const tree = () => React.createElement(trips.module.TripProvider, null, React.createElement(notifications.module.NotificationProvider, null, React.createElement(Probe)));
        await act(async () => { renderer = create(tree()); });
        assert.deepEqual(observed.trips, []);
        assert.deepEqual(observed.notifications, []);
        await act(async () => { observed.pushNotification({ id: 'A-only', title: 'Account A' }, false); });
        fixture.auth = { user: { id: 'B' }, loading: false };
        fixture.itineraryService.getAll = async () => [];
        fixture.friendService.getNotifications = async () => ({ notifications: [], friendRequests: [] });
        await act(async () => { renderer.update(tree()); });
        assert.deepEqual(observed.notifications, []);
        await act(async () => {
            resolveOldTrips([{ id: 'A-private', userId: 'A' }]);
            resolveOldNotifications({ notifications: [{ id: 'A-late' }] });
        });
        assert.deepEqual(observed.trips, []);
        assert.deepEqual(observed.notifications, []);
        assert.ok(storage.get('travel_notifications:A').includes('A-only'));
        assert.equal(storage.has('travel_notifications:B'), false);
        fixture.auth = { user: null, loading: false };
        await act(async () => { renderer.update(tree()); });
        assert.deepEqual(observed.trips, []);
        assert.deepEqual(observed.notifications, []);
    } finally {
        if (renderer) await act(async () => renderer.unmount());
        globalThis.localStorage = old.localStorage;
        globalThis.window = old.window;
        globalThis.__accountFixture = old.fixture;
        globalThis.IS_REACT_ACT_ENVIRONMENT = old.flag;
    }
});
