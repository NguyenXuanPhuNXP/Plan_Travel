import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { act, create } from '../../frontend/node_modules/react-test-renderer/index.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';
import { authRedirect } from '../../frontend/src/utils/authRedirect.js';

test('Login destinations honor roles and internal return paths without granting admin access', () => {
  for (const role of [1, 'admin']) {
    assert.equal(authRedirect({ role }), '/admin');
    assert.equal(authRedirect({ role }, '/admin/users?search=test'), '/admin/users?search=test');
    assert.equal(authRedirect({ role }, '/trip/42'), '/trip/42');
  }
  for (const role of [0, 'user', undefined, '1']) {
    assert.equal(authRedirect({ role }), '/dashboard');
    assert.equal(authRedirect({ role }, '/admin/users'), '/dashboard');
    assert.equal(authRedirect({ role }, '/Admin?tab=users'), '/dashboard');
    assert.equal(authRedirect({ role }, '/planner/map'), '/planner/map');
  }
  for (const from of ['https://example.com', '//example.com', '/\\example.com', 42, {}]) {
    assert.equal(authRedirect({ role: 1 }, from), '/admin');
    assert.equal(authRedirect({ role: 0 }, from), '/dashboard');
  }
});

test('Password and Google sign-in use the returned account role on both authentication pages', async () => {
  const previous = { flag: globalThis.IS_REACT_ACT_ENVIRONMENT, fixture: globalThis.__authRouteFixture };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
  const redirectUrl = new URL('../../frontend/src/utils/authRedirect.js', import.meta.url).href;
  try {
    for (const page of ['Login', 'Register']) {
      let source = await readFile(new URL(`../../frontend/src/pages/${page}.jsx`, import.meta.url), 'utf8');
      source = source.replace("from 'react'", `from '${reactUrl}'`)
        .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => globalThis.__authRouteFixture.auth;')
        .replace(/import \{ useNavigate, useLocation, Link \} from '[^']+';/, "const useNavigate = () => (path, options) => { globalThis.__authRouteFixture.navigation = {path,options}; }; const useLocation = () => ({state:globalThis.__authRouteFixture.state}); const Link = ({children}) => React.createElement('a', null, children);")
        .replace(/import \{([^}]+)\} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim()} = () => null;`).join('\n'))
        .replace("import { motion } from 'framer-motion';", "const motion = { div: ({children}) => React.createElement('div', null, children) };")
        .replace(/import GoogleOneTap from '[^']+';/, "const GoogleOneTap = ({onCredential}) => React.createElement('button', {type:'button', 'data-google':true, onClick:() => onCredential({credential:'test'})});")
        .replace("from '../utils/authRedirect'", `from '${redirectUrl}'`)
        .replace(/import '[^']+\.css';/, '');
      const { code } = await transform(`${page}.jsx`, source, { jsx: { runtime: 'classic' } });
      const { default: Component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
      for (const [role, from, expected] of [[1, undefined, '/admin'], ['admin', undefined, '/admin'], [0, undefined, '/dashboard'], [1, '/admin/users', '/admin/users'], [0, '/admin', '/dashboard'], [0, '/trip/42', '/trip/42']]) {
        const authenticate = async () => ({ id: 7, role });
        const fixture = globalThis.__authRouteFixture = { auth: { login: authenticate, register: authenticate, loginWithGoogle: authenticate }, state: { from }, navigation: null };
        let renderer;
        try {
          await act(async () => { renderer = create(React.createElement(Component)); });
          if (page === 'Register') {
            for (const name of ['password', 'confirmPassword']) {
              await act(async () => { renderer.root.findByProps({ name }).props.onChange({ target: { name, value: 'test-password' } }); });
            }
          }
          await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
          assert.deepEqual(fixture.navigation, { path: expected, options: { replace: true } }, `${page}: password, role ${role}`);
          fixture.navigation = null;
          await act(async () => { await renderer.root.findByProps({ 'data-google': true }).props.onClick(); });
          assert.equal(fixture.navigation.path, expected, `${page}: Google, role ${role}`);
        } finally { if (renderer) await act(async () => renderer.unmount()); }
      }
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.flag;
    globalThis.__authRouteFixture = previous.fixture;
  }
});
