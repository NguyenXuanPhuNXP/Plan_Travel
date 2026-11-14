import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
const destinationsUrl = new URL('../../frontend/src/utils/vietnamDestinations.js', import.meta.url).href;

async function component(path, replace = source => source) {
  const source = replace((await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace("from 'react'", `from '${reactUrl}'`)
    .replace(/from '\.\.\/\.\.\/utils\/vietnamDestinations'/g, `from '${destinationsUrl}'`)
    .replace(/import '[^']+\.css';/g, '')
    .replace(/import \{([^}]+)\} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim()} = () => null;`).join('\n')));
  const { code } = await transform(path, `import React from '${reactUrl}';\n${source}`, { jsx: { runtime: 'classic' } });
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

test('Trip setup suggests destinations before typing, filters unaccented names and fills the selected destination without submitting', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const destinationUrl = await component('../../frontend/src/Components/Map/DestinationInput.jsx');
  const setupUrl = await component('../../frontend/src/Components/Layout/TripSetupForm.jsx', source => source.replace("from '../Map/DestinationInput'", `from '${destinationUrl}'`));
  const { default: TripSetupForm } = await import(setupUrl);
  function Form() {
    const [info, setInfo] = React.useState({ name: '', destination: '', startDate: '', endDate: '', travelerCount: 1, transportMode: '', preferences: [] });
    return React.createElement(TripSetupForm, { info, onChange: setInfo });
  }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Form)); });
    const input = () => renderer.root.findByProps({ placeholder: 'Ví dụ: Đà Nẵng, Hội An…' }).findByType('input');
    const group = () => renderer.root.findByProps({ 'aria-label': 'Gợi ý điểm du lịch' });
    assert.equal(group().findAllByType('button').length, 6);
    assert.equal(renderer.root.findAllByType('datalist').length, 0, 'Visible choices do not duplicate the native popup');
    const daNang = group().findAllByType('button').find(button => button.props.children === 'Đà Nẵng');
    assert.equal(daNang.props.type, 'button', 'Choosing a destination must not submit the trip form');
    await act(async () => daNang.props.onClick());
    assert.equal(input().props.value, 'Đà Nẵng');
    await act(async () => input().props.onChange({ target: { value: 'phu quoc' } }));
    assert.deepEqual(group().findAllByType('button').map(button => button.props.children), ['Phú Quốc']);
    await act(async () => group().findByType('button').props.onClick());
    assert.equal(input().props.value, 'Phú Quốc');
    await act(async () => input().props.onChange({ target: { value: 'Điểm đến tự nhập' } }));
    assert.equal(group().findAllByType('button').length, 0);
    assert.equal(input().props.value, 'Điểm đến tự nhập', 'Free text is preserved when no suggestion matches');
    assert.equal(input().props.required, true);
    await act(async () => input().props.onChange({ target: { value: '' } }));
    assert.equal(group().findAllByType('button').length, 6);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
