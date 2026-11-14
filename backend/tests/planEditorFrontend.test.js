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
                return {
                    ...payload, id: '5', userId: '1',
                    items: payload.items.map((item, index) => ({ ...item, id: item.id || String(100 + index) })),
                    packingItems: payload.packingItems.map((item, index) => ({ ...item, id: item.id || String(200 + index) })),
                    collaborators: payload.collaborators.map((member, index) => ({ ...member, userId: member.userId || String(300 + index), user: { name: member.name || member.email, email: member.email } }))
                };
            }
        },
        navigate: path => { fixture.path = path; }, addTrip: value => { fixture.updated = value; }
    };
    let renderer;
    try {
        const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
        const utilsUrl = new URL('../../frontend/src/utils/planDraft.js', import.meta.url).href;
        const expensesUrl = new URL('../../frontend/src/utils/tripExpenses.js', import.meta.url).href;
        const loadUi = async (name, replacements = {}) => {
            let source = await readFile(new URL(`../../frontend/src/Components/Layout/${name}.jsx`, import.meta.url), 'utf8');
            source = `import React from '${reactUrl}';\n` + source.replace(/from 'react'/, `from '${reactUrl}'`)
                .replace(/import \{ ([^}]+) \} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim()} = () => null;`).join('\n'))
                .replace("from '../../utils/tripExpenses'", `from '${expensesUrl}'`).replace(/import '[^']+\.css';/g, '');
            for (const [from, to] of Object.entries(replacements)) source = source.replace(`from '${from}'`, `from '${to}'`);
            const { code } = await transform(`${name}.jsx`, source, { jsx: { runtime: 'classic' } });
            return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
        };
        const dialogUrl = await loadUi('PlanDialog');
        const expenseDialogUrl = await loadUi('ExpenseDialog', { './PlanDialog': dialogUrl });
        const budgetUrl = await loadUi('TripBudget', { './PlanDialog': dialogUrl, './ExpenseDialog': expenseDialogUrl });
        let destinationSource = await readFile(new URL('../../frontend/src/Components/Map/DestinationInput.jsx', import.meta.url), 'utf8');
        destinationSource = `import React from '${reactUrl}';\n` + destinationSource.replace("from 'react'", `from '${reactUrl}'`).replace("from '../../utils/vietnamDestinations'", `from '${new URL('../../frontend/src/utils/vietnamDestinations.js', import.meta.url).href}'`);
        const destinationCode = await transform('DestinationInput.jsx', destinationSource, { jsx: { runtime: 'classic' } });
        const destinationUrl = `data:text/javascript;base64,${Buffer.from(destinationCode.code).toString('base64')}`;
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
            .replace("from '../Components/Layout/TripBudget'", `from '${budgetUrl}'`)
            .replace("from '../Components/Map/DestinationInput'", `from '${destinationUrl}'`)
            .replace("from '../Components/Layout/PlanDialog'", `from '${dialogUrl}'`)
            .replace("from '../utils/tripExpenses'", `from '${expensesUrl}'`)
            .replace(/import '[^']+\.css';/, '');
        const { code } = await transform('TripEdit.jsx', source, { jsx: { runtime: 'classic' } });
        const { default: Editor } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
        await act(async () => { renderer = create(React.createElement(Editor)); });
        const root = () => renderer.root;
        const nodeText = node => typeof node === 'string' ? node : (node.children || []).map(nodeText).join('');
        const click = async text => act(async () => {
            const button = root().findAllByType('button').find(node => nodeText(node).includes(text));
            assert.ok(button, `Button ${text} should exist`);
            button.props.onClick();
        });
        const field = (name, tag = 'input', index = 0) => root().findAllByType('label')
            .filter(node => node.findAllByType('span').some(span => span.children.filter(child => typeof child === 'string').join('').trim() === name))[index].findByType(tag);
        const change = async (name, value, tag = 'input', index = 0) => act(async () => { field(name, tag, index).props.onChange({ target: { value } }); });
        assert.equal(root().findAllByType('dialog').length, 0, 'Trip information is visible and editable directly without opening a popup');
        assert.equal(field('Tên kế hoạch').props.value, 'Original');
        await change('Tên kế hoạch', 'Personal journey');
        await click('Ngân sách');
        await click('Thêm chi phí');
        await act(async () => { root().findByProps({ 'aria-label': 'Số tiền chi phí' }).props.onChange({ target: { value: '50000' } }); });
        await click('Chọn mục');
        await click('Ẩm thực');
        await act(async () => { root().findAllByType('form').at(-1).props.onSubmit({ preventDefault() {} }); });
        await click('Lịch trình');
        await click('Thêm hoạt động riêng');
        await change('Tên riêng cho điểm dừng', 'Visit my favourite cafe', 'input', 1);
        await click('Đồ mang theo');
        await click('Thêm đồ riêng');
        await change('Tên vật dụng', 'My notebook', 'input', 1);
        await click('Ngân sách');
        await click('Thêm bạn đồng hành');
        await change('Hoặc email tài khoản', 'friend@example.com');
        await click('Thêm vào danh sách');
        await act(async () => { root().findAllByType('button').find(node => nodeText(node) === 'Xong' && node.props.onClick).props.onClick(); });
        assert.equal(fixture.calls.length, 0, 'Changing fields, packing and members must not save automatically');
        await click('Lưu toàn bộ thay đổi');
        assert.equal(fixture.path, null);
        assert.ok(root().findAllByProps({ role: 'alert' }).some(node => node.children.join('').includes('Controlled save error')));
        await click('Thông tin');
        assert.equal(field('Tên kế hoạch').props.value, 'Personal journey', 'Draft must survive a failed save');
        fixture.fail = false;
        await click('Lưu toàn bộ thay đổi');
        assert.equal(fixture.path, '/trip/5');
        const payload = fixture.calls.at(-1);
        assert.equal(payload.costMeals, 50000);
        assert.equal(payload.expenses[0].title, 'Ẩm thực');
        assert.equal(payload.items[0].id, '10');
        assert.equal(payload.items[1].customName, 'Visit my favourite cafe');
        assert.equal(payload.packingItems[1].itemName, 'My notebook');
        assert.equal(payload.collaborators[0].email, 'friend@example.com');
        assert.equal(payload.collaborators[0].permission, 'view');
        fixture.path = null;
        let inlineSaved;
        const editorRef = { current: null };
        await act(async () => { renderer.update(React.createElement(Editor, { embedded: true, editorRef, onSaved: updated => { inlineSaved = updated; } })); });
        assert.equal(root().findAllByType('nav').length, 0, 'Inline editor must keep the original page layout without tab navigation');
        const sections = root().findAll(node => typeof node.type === 'string' && node.props['data-editor-section']);
        assert.ok(sections.every(node => ['general', 'costs', 'members'].includes(node.props['data-editor-section'])), 'Schedule and packing must not duplicate the workspace cards');
        await change('Tên kế hoạch', 'Saved inline');
        await act(async () => { editorRef.current.togglePacking('20'); });
        await act(async () => { editorRef.current.setPackingQuantity('20', '4'); });
        await act(async () => { editorRef.current.addStop({ id: 'map-result', name: 'Map stop', lat: 21.03, lng: 105.84, address: 'Hà Nội' }, 2); });
        await act(async () => { editorRef.current.addPacking({ itemName: 'Added in sidebar', quantity: 3 }); });
        assert.equal(fixture.calls.length, 2, 'Sidebar checklist changes must remain drafts');
        await click('Lưu toàn bộ thay đổi');
        assert.equal(inlineSaved.name, 'Saved inline');
        assert.equal(fixture.calls.at(-1).packingItems.find(item => item.id === '20').quantity, '4');
        assert.equal(fixture.calls.at(-1).items.at(-1).manualLocation.latitude, 21.03);
        assert.equal(fixture.calls.at(-1).items.at(-1).day, 2);
        assert.equal(fixture.calls.at(-1).packingItems.at(-1).itemName, 'Added in sidebar');
        assert.equal(fixture.path, null, 'Saving inline must not navigate away from trip details');
        assert.equal(field('Tên kế hoạch').props.value, 'Saved inline');
        globalThis.window.confirm = () => true;
        await change('Tên kế hoạch', 'Unsaved name');
        await click('Bỏ thay đổi');
        assert.equal(field('Tên kế hoạch').props.value, 'Saved inline');
        assert.equal(fixture.calls.length, 3, 'Discard must not send another save');
        await change('Tên kế hoạch', 'Second inline save');
        await click('Lưu toàn bộ thay đổi');
        assert.equal(inlineSaved.name, 'Second inline save');
        await act(async () => { await editorRef.current.saveStatus('generated'); });
        assert.equal(fixture.calls.at(-1).status, 'generated');
        assert.equal(inlineSaved.status, 'generated', 'Header status action must update the displayed trip after saving');
        assert.equal(field('Trạng thái', 'select').props.value, 'generated');
        const statusSaveCount = fixture.calls.length;
        await change('Tên kế hoạch', 'Keep this unsaved edit');
        await assert.rejects(() => editorRef.current.saveStatus('draft'), /Hãy lưu hoặc bỏ/);
        assert.equal(fixture.calls.length, statusSaveCount, 'Status actions must not overwrite unsaved changes');
        assert.equal(field('Tên kế hoạch').props.value, 'Keep this unsaved edit');
        await click('Bỏ thay đổi');
        fixture.fail = true;
        await act(async () => { await editorRef.current.saveStatus('completed'); });
        assert.equal(inlineSaved.status, 'generated', 'A failed status save must not claim the trip is completed');
    } finally {
        if (renderer) await act(async () => renderer.unmount());
        globalThis.__planEditor = previous.fixture;
        globalThis.window = previous.window;
        globalThis.IS_REACT_ACT_ENVIRONMENT = previous.flag;
    }
});
