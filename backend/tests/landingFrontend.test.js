import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { create, act } from '../../frontend/node_modules/react-test-renderer/index.js';
import { MemoryRouter, useLocation } from '../../frontend/node_modules/react-router-dom/dist/index.mjs';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

const reactUrl = new URL('../../frontend/node_modules/react/index.js', import.meta.url).href;
const routerUrl = new URL('../../frontend/node_modules/react-router-dom/dist/index.mjs', import.meta.url).href;

async function loadComponent(path, replace) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  source = source.replace("from 'react'", `from '${reactUrl}'`)
    .replace("from 'react-router-dom'", `from '${routerUrl}'`)
    .replace(/import \{([^}]+)\} from 'lucide-react';/, (_, names) => names.split(',').map(name => `const ${name.trim()} = () => null;`).join('\n'))
    .replace(/import '[^']+\.css';/g, '');
  const { code } = await transform(path, replace(source), { jsx: { runtime: 'classic' } });
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
}

test('A saving dialog keeps its form open until the request finishes', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const PlanDialog = await loadComponent('../../frontend/src/Components/Layout/PlanDialog.jsx', source => `import React from '${reactUrl}';\n${source}`);
  let renderer;
  let closed = 0;
  let prevented = 0;
  try {
    await act(async () => { renderer = create(React.createElement(PlanDialog, { title: 'Đăng trải nghiệm', busy: true, onClose: () => closed++ })); });
    const dialog = renderer.root.findByType('dialog');
    dialog.props.onCancel({ preventDefault: () => prevented++ });
    dialog.props.onClick({ target: 'backdrop', currentTarget: 'backdrop' });
    assert.equal(prevented, 1);
    assert.equal(closed, 0);
    assert.equal(renderer.root.findByType('button').props.disabled, true);
    await act(async () => renderer.update(React.createElement(PlanDialog, { title: 'Đăng trải nghiệm', busy: false, onClose: () => closed++ })));
    renderer.root.findByType('dialog').props.onCancel({ preventDefault: () => prevented++ });
    assert.equal(closed, 1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});

test('A shared plan displays days, time ranges, budget and map links without private notes', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const CommunityPlan = await loadComponent('../../frontend/src/Components/CommunityPlan.jsx', source => `import React from '${reactUrl}';\n${source}`);
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(CommunityPlan, { plan: { name: 'Hội An hai ngày', destination: 'Hội An', startDate: '2026-01-01T00:00:00+07:00', endDate: '2026-01-02T00:00:00+07:00', totalDays: 2, travelerCount: 2, transportMode: 'car', budget: 2000000, items: [{ name: 'Chùa Cầu', startTime: '2026-01-01T08:00:00+07:00', endTime: '2026-01-01T09:00:00+07:00', note: 'PRIVATE-NOTE' }, { name: 'Trà Quế', startTime: '2026-01-02T08:00:00+07:00' }, { name: 'Chưa hẹn giờ' }] } })); });
    const output = JSON.stringify(renderer.toJSON());
    assert.ok(output.includes('Ngày 1 · 1/1/2026'));
    assert.ok(output.includes('Ngày 2 · 2/1/2026'));
    assert.ok(output.includes('Các điểm chưa xếp ngày'));
    assert.ok(output.includes('08:00'));
    assert.ok(output.includes('09:00'));
    assert.ok(output.includes('2.000.000'));
    assert.ok(!output.includes('PRIVATE-NOTE'));
    assert.equal(renderer.root.findAllByType('a').length, 3);
    assert.ok(renderer.root.findAllByType('a')[0].props.href.includes('https://www.google.com/maps/search/?api=1&query='));
    await act(async () => renderer.update(React.createElement(CommunityPlan, { plan: { name: 'Kế hoạch sáu ngày', startDate: '2026-11-11T17:00:00Z', totalDays: 6, items: [] } })));
    assert.equal(renderer.root.findAllByProps({ className: 'community-plan-day' }).length, 6, 'Every planned day is visible even before stops have been saved');
    assert.ok(JSON.stringify(renderer.toJSON()).includes('Ngày 6 · 17/11/2026'));
    assert.equal(renderer.root.findAllByType('li').length, 0, 'No stops are invented for an empty source itinerary');
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});

test('Landing destination preview updates its content and passes the chosen destination to the planner', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const previousObserver = globalThis.__landingScrollObserver;
  let advanceScroll;
  globalThis.__landingScrollObserver = callback => { advanceScroll = callback; };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const LandingPage = await loadComponent('../../frontend/src/pages/LandingPage.jsx', source => source
    .replace(/import \{[^}]+\} from 'framer-motion';/, `const motion = { div: 'div', span: 'span', img: 'img', path: 'path' };
      const AnimatePresence = ({ children }) => children;
      const useInView = () => true;
      const useReducedMotion = () => true;
      const useScroll = () => ({ scrollY: 'page', scrollYProgress: 'scene' });
      const useTransform = () => 0;
      const useSpring = value => value;
      const useMotionValueEvent = (value, event, callback) => { if (value === 'scene') globalThis.__landingScrollObserver(callback); };`)
    .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => ({ user: null });')
    .replace(/import \{ handleImageError \} from '[^']+';/, 'const handleImageError = () => {};'));
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(MemoryRouter, null, React.createElement(LandingPage))); });
    const root = renderer.root;
    assert.equal(root.findAllByType('h1').length, 1);
    assert.equal(root.findByType('video').props.src, undefined, 'Reduced motion must avoid loading the video');
    assert.equal(root.findByType('video').props.muted, true);
    assert.equal(root.findByType('video').props.playsInline, true);
    const map = root.findByProps({ className: 'landing-vietnam-map is-in-view' });
    assert.equal(map.props['aria-hidden'], 'true', 'Decorative map stays out of the reading order');
    assert.equal(map.findByType('svg').props.focusable, 'false');
    assert.equal(map.findByType('image').props.href, '/images/vietnam-outline.svg');
    assert.equal(map.findAllByProps({ className: 'vietnam-map-stop' }).length, 7);
    assert.ok(map.findAllByType('text').some(node => node.props.children === 'Quần đảo Hoàng Sa'));
    assert.ok(map.findAllByType('text').some(node => node.props.children === 'Quần đảo Trường Sa'));
    const journey = root.findByProps({ className: 'landing-journey-caption' });
    assert.equal(journey.findByType('h3').props.children, 'Hạ Long');
    for (const [progress, destination] of [[0.5, 'Hội An'], [0.95, 'Phú Quốc'], [0.02, 'Hạ Long']]) {
      await act(async () => advanceScroll(progress));
      assert.equal(journey.findByType('h3').props.children, destination, 'Journey follows scroll in both directions');
      assert.equal(map.findAllByProps({ 'data-active': true })[0].findByType('text').props.children, destination);
    }
    const options = root.findByProps({ 'aria-label': 'Chọn điểm đến để xem lịch trình minh họa' });
    const daLat = options.findAllByType('button').find(button => button.props.children === 'Đà Lạt');
    await act(async () => daLat.props.onClick());
    assert.equal(daLat.props['aria-pressed'], true);
    assert.equal(options.findAllByType('button').filter(button => button.props['aria-pressed']).length, 1);
    const preview = root.findByProps({ 'aria-live': 'polite' });
    assert.ok(preview.findAllByType('strong').some(node => node.props.children === 'Dạo quanh hồ Xuân Hương'));
    assert.equal(preview.findAllByType('li').length, 3);
    assert.ok(root.findAllByType('a').some(link => link.props.href === '/planner?destination=%C4%90%C3%A0%20L%E1%BA%A1t&totalDays=3'));
    assert.ok(root.findAllByType('a').some(link => link.props.href === '/planner?destination=Ph%C3%BA%20Qu%E1%BB%91c&totalDays=4'));
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
    globalThis.__landingScrollObserver = previousObserver;
  }
});

test('Home is public, dashboard stays protected, and planner sign-in retains the selected destination', async () => {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const App = await loadComponent('../../frontend/src/App.jsx', source => source
    .replace(/import \{ useAuth \} from '[^']+';/, 'const useAuth = () => ({ user: null, loading: false });')
    .replace(/import ErrorBoundary from '[^']+';/, 'const ErrorBoundary = ({ children }) => children;')
    .replace(/import ChatWidget from '[^']+';/, 'const ChatWidget = () => React.createElement("aside", { "data-chat": true });')
    .replace(/lazy\(\(\) => import\('([^']+)'\)\)/g, (_, page) => `() => React.createElement('div', { 'data-page': '${page}' })`));
  function Location() {
    const location = useLocation();
    return React.createElement('output', { 'data-location': location });
  }
  try {
    for (const [path, page, from] of [
      ['/', './pages/LandingPage', undefined],
      ['/community', './pages/Community', undefined],
      ['/dashboard', './pages/Login', '/dashboard'],
      ['/planner?destination=Da%20Lat&totalDays=3', './pages/Login', '/planner?destination=Da%20Lat&totalDays=3'],
    ]) {
      let renderer;
      try {
        await act(async () => { renderer = create(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App), React.createElement(Location))); });
        assert.equal(renderer.root.findAll(node => node.props['data-page'] === page).length, 1);
        assert.equal(renderer.root.findAllByType('aside').filter(node => node.props['data-chat']).length, path === '/' ? 0 : 1, 'Chat never mounts on the landing page');
        assert.equal(renderer.root.findByType('output').props['data-location'].state?.from, from);
      } finally {
        if (renderer) await act(async () => renderer.unmount());
      }
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
