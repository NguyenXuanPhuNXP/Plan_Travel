import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTripPhotos } from '../../frontend/src/utils/tripPhotos.js';

test('Photo preparation bounds camera images, rejects unsupported/oversized files and releases decoded images', async () => {
  const originalDocument = globalThis.document;
  const originalBitmap = globalThis.createImageBitmap;
  let closed = 0;
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,YQ==' };
  globalThis.document = { createElement: () => canvas };
  globalThis.createImageBitmap = async () => ({ width: 8000, height: 4000, close: () => closed++ });
  try {
    assert.equal((await prepareTripPhotos([{ type: 'image/jpeg', size: 100000 }])).length, 1);
    assert.equal(canvas.width, 2000);
    assert.equal(canvas.height, 1000);
    assert.equal(closed, 1);
    await assert.rejects(() => prepareTripPhotos([{ type: 'image/svg+xml', size: 100 }]), /JPG, PNG/);
    await assert.rejects(() => prepareTripPhotos([{ type: 'image/png', size: 16 * 1024 * 1024 }]), /15 MB/);
    globalThis.createImageBitmap = async () => { throw new Error('Unreadable bytes'); };
    await assert.rejects(() => prepareTripPhotos([{ type: 'image/jpeg', size: 100 }]), /Không đọc được/);
    globalThis.createImageBitmap = async () => ({ width: 2000, height: 2000, close: () => closed++ });
    canvas.toDataURL = () => 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024);
    await assert.rejects(() => prepareTripPhotos([{ type: 'image/webp', size: 100000 }]), /quá lớn/);
    assert.equal(closed, 2, 'Decoded image is released even when encoding exceeds the limit');
  } finally { globalThis.document = originalDocument; globalThis.createImageBitmap = originalBitmap; }
});
