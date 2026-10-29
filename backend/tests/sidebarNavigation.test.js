import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { MemoryRouter } from '../../frontend/node_modules/react-router-dom/dist/index.mjs';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

test('Manual and AI sidebar entries are mutually exclusive, including route aliases', async () => {
    const old = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
    const routerUrl = new URL('../../frontend/node_modules/react-router-dom/dist/index.mjs', import.meta.url).href;
    let source = await readFile(new URL('../../frontend/src/Components/Layout/Sidebar.jsx', import.meta.url), 'utf8');
    source = source.replace("from 'react'", `from '${reactUrl}'`)
        .replace("from 'react-router-dom'", `from '${routerUrl}'`)
        .replace(/import \{([^}]+)\} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim().split(/\s+as\s+/).at(-1)} = () => null;`).join('\n'))
        .replace(/import \{ useNotifications \} from '[^']+';/, 'const useNotifications = () => ({unreadCount:0});')
        .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => ({user:{id:1,role:0}});')
        .replace(/import '[^']+\.css';/, '');
    const { code } = await transform('Sidebar.jsx', source, { jsx: { runtime: 'classic' } });
    const { default: Sidebar } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    try {
        for (const [path, expected] of [['/planner/map', '/planner/map'], ['/planner/manual', '/planner/map'], ['/planner', '/planner'], ['/ai-planner', '/planner'], ['/trip/5', '/history'], ['/', '/']]) {
            let renderer;
            try {
                await act(async () => { renderer = create(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Sidebar))); });
                const active = renderer.root.findAllByType('a').filter(node => node.props.className?.split(' ').includes('active'));
                assert.equal(active.length, 1, `Exactly one active menu item at ${path}`);
                assert.equal(active[0].props.href, expected);
                assert.equal(active[0].props['aria-current'], 'page');
            } finally { if (renderer) await act(async () => renderer.unmount()); }
        }
    } finally { globalThis.IS_REACT_ACT_ENVIRONMENT = old; }
});
