import { mkdir, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const directory = new URL('../../uploads/community/', import.meta.url);
const storedPhoto = /^\/uploads\/community\/[a-f0-9-]{36}\.(jpg|png)$/;
const maxBytes = 2 * 1024 * 1024;
const fail = message => { throw { status: 400, message }; };

function imageDimensions(bytes, type) {
  if (type === 'png' && bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR') {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (type === 'jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (offset + 2 > bytes.length || marker === 218 || marker === 217) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194].includes(marker) && length >= 8) return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      offset += length;
    }
  }
  fail('Ảnh không đúng định dạng JPEG hoặc PNG. Hãy chọn lại ảnh.');
}

export async function saveCommunityPhotos(values, existing = []) {
  if (!Array.isArray(values) || values.length > 8) fail('Mỗi bài viết được thêm tối đa 8 ảnh.');
  const photos = [];
  const files = [];
  let totalBytes = 0;
  for (const value of values) {
    if (typeof value !== 'string') fail('Dữ liệu ảnh không hợp lệ.');
    if (existing.includes(value) && storedPhoto.test(value)) {
      if (photos.includes(value)) fail('Ảnh đính kèm không được trùng nhau.');
      photos.push(value); continue;
    }
    if (value.length > Math.ceil(maxBytes / 3) * 4 + 100) fail('Mỗi ảnh sau khi tối ưu phải nhỏ hơn 2 MB.');
    const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) fail('Chỉ được thêm ảnh JPEG hoặc PNG từ máy của bạn.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64') !== match[2]) fail('Dữ liệu ảnh không hợp lệ hoặc vượt quá 2 MB.');
    const [width, height] = imageDimensions(bytes, match[1]);
    if (!width || !height || width > 4096 || height > 4096 || width * height > 16000000) fail('Ảnh có kích thước quá lớn. Hãy thu nhỏ ảnh trước khi đăng.');
    totalBytes += bytes.length;
    const url = `/uploads/community/${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : 'png'}`;
    photos.push(url); files.push({ url, bytes });
  }
  if (totalBytes > 8 * 1024 * 1024) fail('Tổng ảnh mới không được vượt quá 8 MB.');
  const created = files.map(file => file.url);
  try {
    if (files.length) await mkdir(directory, { recursive: true });
    for (const file of files) await writeFile(new URL(file.url.split('/').at(-1), directory), file.bytes, { flag: 'wx' });
  } catch (error) { await removeCommunityPhotos(created); throw error; }
  return { photos, created };
}

export async function removeCommunityPhotos(photos) {
  for (const photo of photos) {
    if (!storedPhoto.test(photo)) continue;
    try { await rm(new URL(photo.split('/').at(-1), directory), { force: true }); }
    catch (error) { console.warn('Chưa xóa được ảnh chuyến đi:', error.message); }
  }
}
