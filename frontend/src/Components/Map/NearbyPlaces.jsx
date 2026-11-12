import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { fetchGeoapifyPlaces, MAP_PLACE_TYPES } from '../../services/geoapifyMap';

export default function NearbyPlaces({ selectedLocations, onLocationAdd, controlsElement, viewportKey }) {
  const map = useMap();
  const [places, setPlaces] = useState([]);
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Đang tìm địa điểm…');
  const [type, setType] = useState('explore');

  useEffect(() => {
    if (!viewportKey) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setPlaces([]); setMessage('Đang tìm địa điểm…');
      fetchGeoapifyPlaces(map.getBounds().toBBoxString(), controller.signal, type)
      .then(results => {
        if (controller.signal.aborted) return;
        setPlaces(results);
        setMessage(results.length ? `${results.length} địa điểm trong vùng` : 'Chưa có địa điểm. Thử phóng to hoặc chuyển vùng.');
      })
      .catch(error => {
        if (!controller.signal.aborted) setMessage(error.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [map, request, viewportKey, type]);

  return <>
    {controlsElement && createPortal(<>
        <label className="trip-map-category">Loại địa điểm
          <select value={type} onChange={event => { setType(event.target.value); setLoading(true); setPlaces([]); setMessage('Đang tìm địa điểm…'); }}>
            <option value="explore">Khám phá tổng hợp</option>
            {MAP_PLACE_TYPES.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
          </select>
        </label>
        <p role="status">{viewportKey ? message : 'Chọn điểm đến hoặc tìm địa điểm trên bản đồ.'}</p>
        <button type="button" disabled={!viewportKey || loading} onClick={() => {
          setLoading(true); setMessage('Đang tìm địa điểm…'); setRequest(value => value + 1);
        }}>{loading ? 'Đang tìm…' : 'Tìm trong vùng bản đồ'}</button>
    </>, controlsElement)}
    {places.filter(place => !selectedLocations.some(selected =>
      selected.id === place.id || (Math.abs(selected.lat - place.lat) < 0.00001 && Math.abs(selected.lng - place.lng) < 0.00001)
    )).map(place => <CircleMarker key={place.id} center={[place.lat, place.lng]} radius={7}
      pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }} bubblingMouseEvents={false}>
      <Tooltip>{place.name}</Tooltip>
      <Popup keepInView autoPanPadding={[12, 12]}>
        <strong>{place.name}</strong>
        <p>{place.category}</p>
        <p>{place.address || 'Chưa có địa chỉ chi tiết'}</p>
        {place.openingHours && <p>Giờ mở cửa: {place.openingHours}</p>}
        {place.phone && <p>Điện thoại: {place.phone}</p>}
        {typeof onLocationAdd === 'function' && <button type="button" className="btn btn-primary" onClick={event => {
          event.stopPropagation(); onLocationAdd(place); map.closePopup();
        }}>Thêm vào lịch trình</button>}
      </Popup>
    </CircleMarker>)}
  </>;
}
