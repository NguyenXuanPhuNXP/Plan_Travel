// Travel destinations include familiar city names, independently of administrative mergers.
export const VIETNAM_DESTINATIONS = [
  'Đà Nẵng', 'Đà Lạt', 'Vũng Tàu', 'Hà Nội', 'Thành phố Hồ Chí Minh', 'Hội An', 'Huế',
  'Nha Trang', 'Phú Quốc', 'Hạ Long', 'Sa Pa', 'Ninh Bình', 'Phan Thiết', 'Mũi Né',
  'Quy Nhơn', 'Cần Thơ', 'Hải Phòng', 'Côn Đảo', 'Cao Bằng', 'Hà Giang', 'Mộc Châu',
  'Mai Châu', 'Tam Đảo', 'Phong Nha', 'Đồng Hới', 'Tuy Hòa', 'Buôn Ma Thuột', 'Pleiku',
  'An Giang', 'Bà Rịa', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre',
  'Bình Dương', 'Bình Định', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
  'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Thuận',
  'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Tiền Giang',
  'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
  'Mỹ Tho', 'Sa Đéc', 'Châu Đốc', 'Hà Tiên', 'Rạch Giá', 'Vinh', 'Cửa Lò', 'Sầm Sơn',
  'Đồng Văn', 'Mèo Vạc', 'Bắc Hà', 'Hoàng Su Phì', 'Tà Xùa', 'Măng Đen', 'Bảo Lộc',
  'Phan Rang', 'La Gi', 'Long Hải', 'Hồ Tràm', 'Lăng Cô', 'Lý Sơn', 'Cù Lao Chàm'
];

export const normalizeDestination = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export function suggestVietnamDestinations(query) {
  const keyword = normalizeDestination(query);
  if (!keyword) return [];
  return VIETNAM_DESTINATIONS.filter(name => normalizeDestination(name).includes(keyword))
    .sort((a, b) => Number(normalizeDestination(b).startsWith(keyword)) - Number(normalizeDestination(a).startsWith(keyword))).slice(0, 8);
}
