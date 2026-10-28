import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const locationService = {
  getAll: async () => {
    try {
      const response = await axios.get(`${API_BASE}/locations`, { timeout: 3000 });
      return response.data;
    } catch (err) {
      console.warn('Lỗi lấy danh sách địa điểm từ API, dùng dữ liệu dự phòng:', err.message);
      return [];
    }
  },

  createManual: async (locationData) => {
    try {
      const payload = {
        name: locationData.name,
        address: locationData.address || '',
        description: locationData.description || '',
        image: locationData.imageUrl || locationData.image || '',
        latitude: locationData.latitude ?? locationData.lat,
        longitude: locationData.longitude ?? locationData.lng,
        category_id: locationData.category_id || null
      };

      const response = await axios.post(`${API_BASE}/locations`, payload, { timeout: 3000 });
      return {
        ...locationData,
        id: response.data.id || `loc_${Date.now()}`
      };
    } catch (err) {
      console.warn('Backend không phản hồi khi tạo địa điểm, lưu tạm trên client:', err.message);
      return {
        ...locationData,
        id: `loc_manual_${Date.now()}`
      };
    }
  }
};
