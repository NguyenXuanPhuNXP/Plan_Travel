import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { saveCommunityPhotos, removeCommunityPhotos } from '../src/services/communityPhotos.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
const dataURL = (bytes, type = 'png') => `data:image/${type};base64,${bytes.toString('base64')}`;
const disk = url => new URL(`../${url.slice(1)}`, import.meta.url);

test('Trip photo storage accepts bounded JPEG/PNG images and rejects invalid or foreign file references', async () => {
  const jpeg = await readFile(new URL('../../frontend/public/images/destinations/hoi-an.jpg', import.meta.url));
  let created = [];
  try {
    const saved = await saveCommunityPhotos([dataURL(jpeg, 'jpeg'), dataURL(png)]);
    created = saved.created;
    assert.equal(saved.photos.length, 2);
    assert.deepEqual(await readFile(disk(saved.photos[0])), jpeg);
    assert.deepEqual(await readFile(disk(saved.photos[1])), png);
    assert.deepEqual((await saveCommunityPhotos([saved.photos[0]], saved.photos)).photos, [saved.photos[0]]);
    const tooWide = Buffer.from(png); tooWide.writeUInt32BE(5000, 16);
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1);
    const totalLimit = Buffer.alloc(2 * 1024 * 1024); jpeg.copy(totalLimit); totalLimit[totalLimit.length - 2] = 255; totalLimit[totalLimit.length - 1] = 217;
    for (const invalid of [{}, Array(9).fill(dataURL(png)), [null], ['https://example.com/photo.jpg'], [saved.photos[0]], ['/uploads/community/../../secret.png'], ['data:image/svg+xml;base64,PHN2Zz4='], [dataURL(png, 'jpeg')], [dataURL(Buffer.from('not an image'))], [dataURL(tooWide)], [dataURL(oversized, 'jpeg')], Array(5).fill(dataURL(totalLimit, 'jpeg'))]) {
      await assert.rejects(() => saveCommunityPhotos(invalid), error => error.status === 400);
    }
  } finally { await removeCommunityPhotos(created); }
  for (const photo of created) await assert.rejects(() => access(disk(photo)), { code: 'ENOENT' });
});
