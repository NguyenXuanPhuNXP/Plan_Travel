import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Parallel expired API requests share one refresh and retain the new session', async () => {
    const axiosUrl = new URL('../../frontend/node_modules/axios/index.js', import.meta.url).href;
    const { default: axios } = await import(axiosUrl);
    const storage = new Map([['access_token', 'expired'], ['refresh_token', 'refresh-one']]);
    const previousStorage = globalThis.localStorage;
    const previousWindow = globalThis.window;
    const previousAdapter = axios.defaults.adapter;
    globalThis.localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
    };
    globalThis.window = new EventTarget();
    let rotations = 0;
    axios.defaults.adapter = async config => {
        if (config.url.endsWith('/auth/refresh')) {
            rotations++;
            await new Promise(resolve => setTimeout(resolve, 20));
            return { status: 200, data: { token: 'new-access', refreshToken: 'refresh-two' }, config, headers: {} };
        }
        if (config.headers.Authorization !== 'Bearer new-access') {
            throw new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, null, { status: 401, config });
        }
        return { status: 200, data: { ok: true }, config, headers: {} };
    };
    try {
        // Load the Vite module with its build-time URL replaced; run its actual interceptors.
        const source = (await readFile(new URL('../../frontend/src/services/apiClient.js', import.meta.url), 'utf8'))
            .replace("'axios'", JSON.stringify(axiosUrl))
            .replace('import.meta.env.VITE_API_URL', 'undefined');
        const { default: client } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
        const responses = await Promise.all([client.get('/itineraries'), client.get('/friends'), client.get('/auth/me')]);
        assert.equal(rotations, 1);
        assert.ok(responses.every(response => response.status === 200));
        assert.equal(storage.get('refresh_token'), 'refresh-two');
        assert.equal(storage.get('access_token'), 'new-access');
    } finally {
        axios.defaults.adapter = previousAdapter;
        globalThis.localStorage = previousStorage;
        globalThis.window = previousWindow;
    }
});
