import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

test('Editor keeps all five sections as a draft, survives save failure and sends a complete saved plan', async () => {
    const previous = { fixture: globalThis.__planEditor, window: globalThis.window, flag: globalThis.IS_REACT_ACT_ENVIRONMENT };
    globalThis.window = new EventTarget();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const trip = { id: '5', userId: '1', name: 'Original', totalDays: 2, travelerCount: 2, status: 'draft', visibility: 'private',
        items: [{ id: '10', customName: 'Original activity', note: '[DAY:1] Original note' }],
        packingItems: [{ id: '20', itemName: 'Backpack', quantity: 1, category: 'tools', isPacked: false }], collaborators: [] };
    const fixture = globalThis.__planEditor = {
        fail: true, calls: [], path: null, user: { id: '1', fullName: 'Owner', email: 'owner@example.com' },
        service: {
            getById: async () => trip, getPackingCatalog: async () => [],
            savePlan: async (_id, payload) => {
                fixture.calls.push(payload);
                if (fixture.fail) throw { response: { data: { message: 'Controlled save error' } } };
                return { ...payload, id: '5', userId: '1' };
            }
        },
        navigate: path => { fixture.path = path; }, addTrip: value => { fixture.updated = value; }
    };
    let renderer;
    try {
        const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
        const utilsUrl = new URL('../../frontend/src/utils/planDraft.js', import.meta.url).href;
        let source = await readFile(new URL('../../frontend/src/pages/TripEdit.jsx', import.meta.url), 'utf8');
        source = `import React from '${reactUrl}';\n` + source.replace(/from 'react'/, `from '${reactUrl}'`)
            .replace(/import \{ Link, useNavigate, useParams \} from '[^']+';/, "const Link = ({children}) => React.createElement('a', null, children); const useParams = () => ({id:'5'}); const useNavigate = () => globalThis.__planEditor.navigate;")
            .replace(/import \{ ([^}]+) \} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim()} = () => null;`).join('\n'))
            .replace(/import Layout from '[^']+';/, "const Layout = ({children}) => React.createElement('div', null, children);")
            .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => ({user:globalThis.__planEditor.user});')
            .replace(/import \{ useTrips \} from '[^']+';/, 'const useTrips = () => ({addTrip:globalThis.__planEditor.addTrip});')
            .replace(/import \{ itineraryService \} from '[^']+';/, 'const itineraryService = globalThis.__planEditor.service;')
            .replace(/import \{ friendService \} from '[^']+';/, 'const friendService = {getFriends: async () => []};')
            .replace(/import apiClient from '[^']+';/, 'const apiClient = {get: async () => ({data:[]})};')
            .replace("from '../utils/planDraft'", `from '${utilsUrl}'`)
            .replace(/import '[^']+\.css';/, '');
        const { code } = await transform('TripEdit.jsx', source, { jsx: { runtime: 'classic' } });
        const { default: Editor } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
        await act(async () => { renderer = create(React.createElement(Editor)); });
        const root = () => renderer.root;
        const click = async text => act(async () => {
            const button = root().findAllByType('button').find(node => node.children.some(child => typeof child === 'string' && child.includes(text)));
            assert.ok(button, `Button ${text} should exist`);
            button.props.onClick();
        });
        const field = (name, tag = 'input', index = 0) => root().findAllByType('label')
            .filter(node => node.findAllByType('span').some(span => span.children.join('') === name))[index].findByType(tag);
        const change = async (name, value, tag = 'input', index = 0) => act(async () => { field(name, tag, index).props.onChange({ target: { value } }); });
        await change('Tên kế hoạch', 'Personal journey');
        await click('Chi phí');
        await change('Ăn uống (VNĐ)', '50000');
        await click('Lịch trình');
        await click('Thêm hoạt động riêng');
        await change('Tên riêng cho điểm dừng', 'Visit my favourite cafe', 'input', 1);
        await click('Đồ mang theo');
        await click('Thêm đồ riêng');
        await change('Tên vật dụng', 'My notebook', 'input', 1);
        await click('Thành viên');
        await change('Hoặc email tài khoản', 'friend@example.com');
        await click('Thêm vào danh sách');
        await click('Lưu toàn bộ thay đổi');
        assert.equal(fixture.path, null);
        assert.ok(root().findAllByProps({ role: 'alert' }).some(node => node.children.join('').includes('Controlled save error')));
        await click('Thông tin');
        assert.equal(field('Tên kế hoạch').props.value, 'Personal journey', 'Draft must survive a failed save');
        fixture.fail = false;
        await click('Lưu toàn bộ thay đổi');
        assert.equal(fixture.path, '/trip/5');
        const payload = fixture.calls.at(-1);
        assert.equal(payload.costMeals, '50000');
        assert.equal(payload.items[0].id, '10');
        assert.equal(payload.items[1].customName, 'Visit my favourite cafe');
        assert.equal(payload.packingItems[1].itemName, 'My notebook');
        assert.equal(payload.collaborators[0].email, 'friend@example.com');
        assert.equal(payload.collaborators[0].permission, 'view');
        fixture.path = null;
        let inlineSaved;
        await act(async () => { renderer.update(React.createElement(Editor, { embedded: true, onSaved: updated => { inlineSaved = updated; } })); });
        assert.equal(root().findAllByType('nav').length, 0, 'Inline editor must keep the original page layout without tab navigation');
        assert.equal(root().findAllByType('details').length, 5);
        await change('Tên kế hoạch', 'Saved inline');
        await click('Lưu toàn bộ thay đổi');
        assert.equal(inlineSaved.name, 'Saved inline');
        assert.equal(fixture.path, null, 'Saving inline must not navigate away from trip details');
    } finally {
        if (renderer) await act(async () => renderer.unmount());
        globalThis.__planEditor = previous.fixture;
        globalThis.window = previous.window;
        globalThis.IS_REACT_ACT_ENVIRONMENT = previous.flag;
    }
});
