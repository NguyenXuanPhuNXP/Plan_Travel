import test from 'node:test';
import assert from 'node:assert/strict';
import { itineraryDayStyle } from '../../frontend/src/utils/itineraryDayColors.js';

const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};

test('Day colors stay stable across filtering, repeat safely and have readable labels', () => {
  const styles = Array.from({ length: 6 }, (_, index) => itineraryDayStyle(index + 1));
  assert.equal(new Set(styles.map(style => style['--day-color'])).size, 6);
  assert.deepEqual(itineraryDayStyle(2), styles[1]);
  assert.deepEqual(itineraryDayStyle(7), styles[0]);
  for (const invalid of [undefined, 0, -1, 1.5, NaN, Infinity, '<script>']) {
    assert.deepEqual(itineraryDayStyle(invalid), styles[0]);
  }
  for (const style of styles) {
    const foreground = luminance(style['--day-color']);
    assert.ok((1.05 / (foreground + 0.05)) >= 4.5, 'White marker text has AA contrast');
    assert.ok((luminance(style['--day-background']) + 0.05) / (foreground + 0.05) >= 4.5, 'Day text has AA contrast');
  }
});
