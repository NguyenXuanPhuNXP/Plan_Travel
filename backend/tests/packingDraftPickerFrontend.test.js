import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React, { useState } from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

test('Packing catalog toggles saved and newly added items without closing the picker', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer;
  try {
    const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
    let source = await readFile(new URL('../../frontend/src/Components/Layout/PackingDraftPicker.jsx', import.meta.url), 'utf8');
    source = `import React from '${reactUrl}';\n` + source.replace("from 'react'", `from '${reactUrl}'`)
      .replace(/import \{ Plus, X \} from 'lucide-react';/, 'const Plus = () => null; const X = () => null;')
      .replace(/import '[^']+\.css';/g, '');
    const { code } = await transform('PackingDraftPicker.jsx', source, { jsx: { runtime: 'classic' } });
    const { default: Picker } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const removals = [];
    let closed = false;
    function Harness() {
      const [selected, setSelected] = useState([{ id: 'saved-42', itemName: ' KÍNH MÁT ', quantity: 1 }]);
      return React.createElement(Picker, {
        catalog: [{ id: 'catalog-1', name: 'Kính mát' }], selected,
        onAdd: item => setSelected(items => [...items, { key: 'draft-item', itemName: item.name, quantity: 1 }]),
        onRemove: key => { removals.push(key); setSelected(items => items.filter(item => (item.id || item.key) !== key)); },
        onClose: () => { closed = true; }
      });
    }
    await act(async () => { renderer = create(React.createElement(Harness)); });
    const button = () => renderer.root.findAllByType('button').find(node => node.props['aria-pressed'] !== undefined);
    assert.equal(button().props['aria-pressed'], true);
    assert.notEqual(button().props.disabled, true);
    await act(async () => button().props.onClick());
    assert.deepEqual(removals, ['saved-42']);
    assert.deepEqual(button().children, ['Thêm']);
    await act(async () => button().props.onClick());
    assert.deepEqual(button().children, ['Đã thêm']);
    await act(async () => button().props.onClick());
    assert.deepEqual(removals, ['saved-42', 'draft-item']);
    assert.deepEqual(button().children, ['Thêm']);
    assert.equal(closed, false);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
