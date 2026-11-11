import test from 'node:test';
import assert from 'node:assert/strict';
import { tripStatusLabel } from '../../frontend/src/utils/tripStatus.js';
import { destinationImage, handleImageError, DESTINATION_PLACEHOLDER } from '../../frontend/src/utils/destinationImages.js';

test('Every persisted status is distinct and unknown values never look completed', () => {
  assert.equal(tripStatusLabel('draft'), 'Bản nháp');
  assert.equal(tripStatusLabel('generated'), 'Sẵn sàng khởi hành');
  assert.equal(tripStatusLabel('completed'), 'Đã hoàn thành');
  assert.equal(tripStatusLabel('cancelled'), 'Đã hủy');
  assert.equal(tripStatusLabel('invalid'), 'Chưa xác định');
});

test('Destination photos replace old stock images, preserve uploads and have a finite fallback', () => {
  assert.equal(destinationImage(' ĐÀ NẴNG ', 'https://images.unsplash.com/old'), '/images/destinations/da-nang.jpg');
  assert.equal(destinationImage('Sa Pa'), destinationImage('Sapa'));
  assert.equal(destinationImage('Đà Nẵng', '/uploads/my-photo.jpg'), '/uploads/my-photo.jpg');
  assert.equal(destinationImage('Unknown destination'), DESTINATION_PLACEHOLDER);
  assert.equal(destinationImage(null), DESTINATION_PLACEHOLDER);
  assert.equal(destinationImage('Custom activity', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'), DESTINATION_PLACEHOLDER);
  let assignments = 0;
  let src = 'https://example.com/broken.jpg';
  const currentTarget = { get src() { return src; }, set src(value) { src = value; assignments++; } };
  handleImageError({ currentTarget });
  handleImageError({ currentTarget });
  assert.equal(src, DESTINATION_PLACEHOLDER);
  assert.equal(assignments, 1);
});
