import apiClient from './apiClient';

export const WeatherService = {
  getWeather: async (lat, lon) => {
    try {
      const { data } = await apiClient.get('/weather', { params: { lat, lon }, timeout: 15000 });
      return data;
    } catch (error) {
      console.error('Weather Service Error:', error);
      // Fallback data if API is not running
      return {
        temp: '25°C',
        condition: 'Không có dữ liệu',
        rain_mm: 0,
        city: 'Không rõ',
        isFallback: true
      };
    }
  }
};
