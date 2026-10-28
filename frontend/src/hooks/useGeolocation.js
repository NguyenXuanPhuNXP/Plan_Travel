import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState(null);

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị');
      return;
    }

    // In most browsers, geolocation requires a secure context (HTTPS or localhost).
    if (!window.isSecureContext) {
      setError('Không thể lấy vị trí: trang cần chạy trên HTTPS hoặc localhost.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(perm.state);
        if (perm.state === 'denied') {
          setError('Bạn đã chặn quyền vị trí. Hãy bật quyền vị trí cho trang này rồi thử lại.');
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    const toErrorMessage = (err) => {
      if (!err) return 'Lỗi không xác định';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          return 'Bạn đã từ chối quyền vị trí. Vui lòng cho phép truy cập vị trí và thử lại.';
        case err.POSITION_UNAVAILABLE:
          return 'Không xác định được vị trí (GPS/tín hiệu yếu). Hãy thử ra ngoài trời và bật “Độ chính xác vị trí”.';
        case err.TIMEOUT:
          return 'Lấy vị trí bị quá thời gian. Đang thử lại...';
        default:
          return err.message || 'Lỗi không xác định';
      }
    };

    const resolvePosition = (position) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setLoading(false);
    };

    const rejectPosition = (err) => {
      setError(toErrorMessage(err));
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      resolvePosition,
      (err) => {
        // Retry once with a longer timeout + lower accuracy to avoid hard failures on some devices.
        if (err?.code === err.TIMEOUT) {
          setError(toErrorMessage(err));
          navigator.geolocation.getCurrentPosition(
            resolvePosition,
            rejectPosition,
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
          );
          return;
        }
        rejectPosition(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  return { location, error, loading, getLocation, permissionState };
};
