export async function prepareTripPhotos(files) {
  const photos = [];
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Hãy chọn ảnh JPG, PNG hoặc WebP.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Ảnh gốc cần nhỏ hơn 15 MB. Hãy chọn ảnh nhẹ hơn.');
    let bitmap;
    try { bitmap = await createImageBitmap(file); }
    catch { throw new Error('Không đọc được ảnh này. Hãy chọn một ảnh JPG, PNG hoặc WebP khác.'); }
    try {
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.85);
      if (photo.length * 0.75 > 2 * 1024 * 1024) throw new Error('Ảnh vẫn quá lớn sau khi tối ưu. Hãy chọn ảnh nhẹ hơn.');
      photos.push(photo);
    } finally { bitmap.close(); }
  }
  return photos;
}
