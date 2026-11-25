export const DESTINATION_PLACEHOLDER = '/images/destination-placeholder.svg';

const PHOTOS = {
  'da nang': 'da-nang', 'da lat': 'da-lat', 'phu quoc': 'phu-quoc',
  'hoi an': 'hoi-an', 'sapa': 'sa-pa', 'sa pa': 'sa-pa', 'nha trang': 'nha-trang',
  'hue': 'hue', 'ha long': 'ha-long', 'vung tau': 'vung-tau', 'quy nhon': 'quy-nhon', 'ha noi': 'ha-noi'
};

export function destinationImage(name = '', source = '') {
  // Keep uploaded/custom images; replace the old stock Unsplash placeholders for known cities.
  if (source && !source.includes('images.unsplash.com')) return source;
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
  if (PHOTOS[key]) return `/images/destinations/${PHOTOS[key]}.jpg`;
  return source && !source.includes('photo-1476514525535-07fb3b4ae5f1') ? source : DESTINATION_PLACEHOLDER;
}

export function handleImageError(event) {
  const image = event.currentTarget;
  if (!image.src.endsWith(DESTINATION_PLACEHOLDER)) image.src = DESTINATION_PLACEHOLDER;
}
