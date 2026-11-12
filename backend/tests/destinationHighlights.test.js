import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATION_HIGHLIGHTS, destinationHighlights } from '../../frontend/src/utils/destinationHighlights.js';

test('Destination highlights cover each catalog city, normalize names and never substitute a different region', () => {
  assert.equal(DESTINATION_HIGHLIGHTS.length, 11);
  assert.equal(DESTINATION_HIGHLIGHTS.reduce((sum, item) => sum + item.places.length, 0), 44);
  assert.equal(destinationHighlights(' DA NANG ').destination, 'Đà Nẵng');
  assert.equal(destinationHighlights('sapa').destination, 'Sa Pa');
  assert.equal(destinationHighlights('Unknown city'), null);
  assert.ok(destinationHighlights('Hạ Long').places.some(([name]) => name === 'Hang Sửng Sốt'));
  for (const item of DESTINATION_HIGHLIGHTS) {
    assert.equal(new Set(item.places.map(([name]) => name)).size, item.places.length);
    assert.equal(new URL(item.source).protocol, 'https:');
    assert.ok(item.places.every(([name, description]) => name && description));
  }
});
