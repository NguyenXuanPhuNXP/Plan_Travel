const BASE_URL = 'http://localhost:8001/api';

export const WeatherService = {
  getWeather: async (lat, lon) => {
    try {
      const response = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      return await response.json();
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
