export const TRIP_STATUS_LABELS = {
  draft: 'Bản nháp',
  generated: 'Sẵn sàng khởi hành',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy'
};

export const tripStatusLabel = status => TRIP_STATUS_LABELS[status] || 'Chưa xác định';
