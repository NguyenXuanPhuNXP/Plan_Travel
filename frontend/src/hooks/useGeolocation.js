import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        let errorMsg = 'Lỗi không xác định';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Người dùng từ chối cấp quyền truy cập vị trí';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Thông tin vị trí không khả dụng';
            break;
          case err.TIMEOUT:
            errorMsg = 'Yêu cầu lấy vị trí hết thời gian';
            break;
        }
        setError(errorMsg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  return { location, error, loading, getLocation };
};
