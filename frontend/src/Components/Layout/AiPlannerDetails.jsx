import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Clock3, LocateFixed, MapPin, Users } from 'lucide-react';
import { geoapifyAttribution, geoapifyKey, geoapifyTileUrl, fetchGeoapify } from '../../services/geoapifyMap';
import { useGeolocation } from '../../hooks/useGeolocation';

function SelectOnMap({ value, onSelect }) {
  useMapEvents({ click: event => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return value ? <Marker position={[value.latitude, value.longitude]} /> : null;
}

function CenterOnSelection({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 14));
    }
  }, [map, value]);
  return null;
}

export default function AiPlannerDetails({ info, onChange }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [draftLocation, setDraftLocation] = useState(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const useGpsInMap = useRef(false);
  const initialGpsPending = useRef(true);
  const selectionRequest = useRef(0);
  const [mapError, setMapError] = useState('');
  const { location, error: gpsError, loading: gpsLoading, getLocation } = useGeolocation();
  const startLocation = info.startLocation;
  const change = (key, value) => onChange(previous => ({ ...previous, [key]: value }));

  useEffect(() => { if (!startLocation) getLocation(); }, [getLocation, startLocation]);

  useEffect(() => {
    if (!location) return;
    const point = { latitude: location.lat, longitude: location.lng };
    if (mapOpen) {
      if (!useGpsInMap.current) return;
      useGpsInMap.current = false;
      selectPoint(point, false);
    } else if (initialGpsPending.current) {
      initialGpsPending.current = false;
      selectPoint(point, true);
    }
  }, [location, mapOpen]);

  const selectPoint = async (point, commit = false) => {
    if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 || !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
      setMapError('Tọa độ vị trí không hợp lệ.');
      return;
    }
    const requestId = ++selectionRequest.current;
    setMapError('');
    setManualLatitude(String(point.latitude));
    setManualLongitude(String(point.longitude));
    let address = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
    const provisionalLocation = { ...point, name: address, address };
    if (commit) change('startLocation', provisionalLocation);
    else setDraftLocation(provisionalLocation);
    if (geoapifyKey) {
      try {
        const data = await fetchGeoapify('geocode/reverse', { lat: point.latitude, lon: point.longitude, format: 'json', lang: 'vi', limit: 1 });
        address = data.results?.[0]?.formatted || address;
      } catch { setMapError('Không lấy được địa chỉ; bạn vẫn có thể xác nhận bằng tọa độ.'); }
    } else {
      setMapError('Chưa cấu hình dịch vụ địa chỉ; bạn vẫn có thể xác nhận bằng tọa độ.');
    }
    if (requestId !== selectionRequest.current) return;
    const nextLocation = { ...point, name: address, address };
    if (commit) change('startLocation', nextLocation);
    else setDraftLocation(nextLocation);
  };

  return <section className="ai-planner-details" aria-label="Thông tin bổ sung cho chuyến đi">
    <h3><Clock3 size={17} /> Thông tin bổ sung cho chuyến đi</h3>
    <div className="trip-setup-row">
      <label className="trip-setup-field"><span><Users size={17} /> Số người tham gia</span><input type="number" min="1" max="100" value={info.travelerCount} onChange={event => change('travelerCount', event.target.value)} /></label>
      <label className="trip-setup-field"><span>Số địa điểm tối đa mỗi ngày</span><input type="number" min="1" max="8" placeholder="Để AI đề xuất" value={info.maxStopsPerDay === 'auto' ? '' : info.maxStopsPerDay} onChange={event => change('maxStopsPerDay', event.target.value === '' ? 'auto' : event.target.value)} /><small>Tối đa 8 điểm hoạt động/ngày; AI có thể đề xuất ít hơn tùy thời gian và quãng đường.</small></label>
      <label className="trip-setup-field"><span><Clock3 size={17} /> Giờ khởi hành</span><input type="time" value={info.departureTime} onChange={event => change('departureTime', event.target.value)} /></label>
      <label className="trip-setup-field"><span>Chi phí dự kiến cả chuyến (VNĐ)</span><input type="number" min="0" max="999999999999" placeholder="Không bắt buộc" value={info.budget} onChange={event => change('budget', event.target.value)} /><small>Được gửi cho AI để cân đối lịch trình và dịch vụ.</small></label>
    </div>
    <label className="trip-setup-field"><span><MapPin size={17} /> Vị trí khởi hành</span><button type="button" className="btn btn-outline ai-start-location-button" onClick={() => { initialGpsPending.current = false; useGpsInMap.current = false; setDraftLocation(startLocation || null); setManualLatitude(startLocation?.latitude == null ? '' : String(startLocation.latitude)); setManualLongitude(startLocation?.longitude == null ? '' : String(startLocation.longitude)); setMapOpen(true); setMapError(''); }}>{startLocation?.address || 'Chọn trên bản đồ (mặc định: chưa xác định)'}</button></label>
    {(gpsError || mapError) && <p role="alert" className="trip-map-error">{gpsError || mapError}</p>}
    {mapOpen && <div className="ai-start-map-modal" role="dialog" aria-label="Chọn vị trí khởi hành"><div className="ai-start-map-toolbar"><strong>Chọn vị trí khởi hành</strong><div><button type="button" className="btn btn-outline" onClick={() => { useGpsInMap.current = true; if (location) { useGpsInMap.current = false; selectPoint({ latitude: location.lat, longitude: location.lng }, false); } else getLocation(); }} disabled={gpsLoading}><LocateFixed size={15} /> {gpsLoading ? 'Đang lấy vị trí…' : 'Lấy vị trí hiện tại'}</button><label>Vĩ độ <input type="number" min={-90} max={90} step="any" value={manualLatitude} onChange={event => setManualLatitude(event.target.value)} /></label><label>Kinh độ <input type="number" min={-180} max={180} step="any" value={manualLongitude} onChange={event => setManualLongitude(event.target.value)} /></label><button type="button" className="btn btn-outline" onClick={() => selectPoint({ latitude: Number(manualLatitude), longitude: Number(manualLongitude) }, false)} disabled={manualLatitude === '' || manualLongitude === ''}>Đặt marker theo tọa độ</button><button type="button" className="btn btn-outline" onClick={() => { useGpsInMap.current = false; selectionRequest.current += 1; setDraftLocation(startLocation || null); setMapOpen(false); }}>Hủy</button><button type="button" className="btn btn-primary" disabled={!draftLocation} onClick={() => { useGpsInMap.current = false; change('startLocation', draftLocation); setMapOpen(false); }}>Xác nhận vị trí</button></div></div><div className="ai-start-map"><MapContainer center={draftLocation ? [draftLocation.latitude, draftLocation.longitude] : [16.05, 108.2]} zoom={draftLocation ? 14 : 6} style={{ height: '100%', width: '100%' }}><TileLayer attribution={geoapifyAttribution} url={geoapifyTileUrl} /><CenterOnSelection value={draftLocation} /><SelectOnMap value={draftLocation} onSelect={point => selectPoint(point, false)} /></MapContainer></div></div>}
  </section>;
}
