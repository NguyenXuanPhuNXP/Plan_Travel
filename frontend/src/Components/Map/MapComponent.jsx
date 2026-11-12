import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap,
  Polyline, 
  ZoomControl 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PlaceSearch from './PlaceSearch';
import NearbyPlaces from './NearbyPlaces';
import './MapComponent.css';
import { searchMapPlaces } from '../../services/tripPlaceSearch';
import { Thermometer, CloudRain } from 'lucide-react';
import { WeatherService } from '../../services/WeatherService';
import { geoapifyKey, geoapifyTileUrl, geoapifyAttribution, fetchGeoapifyRoute, resolveMapDestination } from '../../services/geoapifyMap';
import { DESTINATION_PLACEHOLDER, handleImageError } from '../../utils/destinationImages';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapViewport({ coordinates, focusedLocation, destinationLocation, searchedLocation }) {
  const map = useMap();
  const previousDestination = useRef(null);
  useEffect(() => {
    map.invalidateSize();
    if (destinationLocation && previousDestination.current !== destinationLocation.name) {
      previousDestination.current = destinationLocation.name;
      map.setView([destinationLocation.lat, destinationLocation.lng], 12, { animate: false });
      return;
    }
    const points = coordinates ? coordinates.split(';').map(point => point.split(',').map(Number).reverse()) : [];
    if (points.length) map.fitBounds(points, { padding: [48, 48], maxZoom: 13 });
    else if (destinationLocation) map.setView([destinationLocation.lat, destinationLocation.lng], 12);
  }, [map, coordinates, destinationLocation]);
  useEffect(() => {
    if (focusedLocation?.hasRealCoords) map.setView([focusedLocation.lat, focusedLocation.lng], 15);
  }, [map, focusedLocation]);
  useEffect(() => {
    if (searchedLocation) map.setView([searchedLocation.latitude, searchedLocation.longitude], 14);
  }, [map, searchedLocation]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

const MapComponent = ({ selectedLocations = [], onLocationAdd, onLocationRemove, showRoute = true, focusedLocation, numberMarkers = false, searchContext = '' }) => {
  const [weatherData, setWeatherData] = useState({});
  const [controlsElement, setControlsElement] = useState(null);
  const [destinationResult, setDestinationResult] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const destinationLocation = destinationResult?.query === searchContext ? destinationResult.place : null;
  const searchedLocation = searchResult?.context === searchContext ? searchResult.place : null;
  useEffect(() => {
    const controller = new AbortController();
    resolveMapDestination(searchContext, controller.signal)
      .then(place => { if (!controller.signal.aborted) setDestinationResult({ query: searchContext, place }); })
      .catch(error => { if (!controller.signal.aborted) setDestinationResult({ query: searchContext, error: error.message }); });
    return () => controller.abort();
  }, [searchContext]);

  // Filter only valid locations with finite lat/lng to prevent Leaflet LatLng crash
  const validLocations = (Array.isArray(selectedLocations) ? selectedLocations : [])
    .filter((loc) => loc && (loc.lat ?? loc.latitude) != null && (loc.lng ?? loc.longitude) != null && Number.isFinite(Number(loc.lat ?? loc.latitude)) && Number.isFinite(Number(loc.lng ?? loc.longitude)))
    .map((loc) => ({
      ...loc,
      id: loc.tripLocId || loc.id,
      image: loc.image || loc.imageUrl,
      lat: Number(loc.lat ?? loc.latitude),
      lng: Number(loc.lng ?? loc.longitude)
    }));

  const center = validLocations.length > 0
    ? [validLocations[0].lat, validLocations[0].lng]
    : [16.05, 108.2];

  const fetchWeatherForLocation = async (id, lat, lng) => {
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || weatherData[id]) return;
    try {
      const data = await WeatherService.getWeather(lat, lng);
      setWeatherData(prev => ({ ...prev, [id]: data }));
    } catch {
      // silent
    }
  };

  const [routeGeometry, setRouteGeometry] = useState({ coordinates: '', points: [] });
  const [mapError, setMapError] = useState('');

  // Depend on coordinate values, not a new array allocated on every render.
  const routeCoordinates = validLocations.map(loc => `${loc.lng},${loc.lat}`).join(';');

  useEffect(() => {
    const controller = new AbortController();
    if (!showRoute || !routeCoordinates.includes(';')) return;

    const fetchRoute = async () => {
      try {
        const points = await fetchGeoapifyRoute(routeCoordinates, controller.signal);
        if (!controller.signal.aborted) {
          setRouteGeometry({ coordinates: routeCoordinates, points });
        }
      } catch (err) {
        if (!controller.signal.aborted) setRouteGeometry({ coordinates: routeCoordinates, points: [], error: err.message });
      }
    };

    fetchRoute();
    return () => controller.abort();
  }, [routeCoordinates, showRoute]);

  const mapMessage = !geoapifyKey ? 'Chưa cấu hình khóa bản đồ Geoapify.' : mapError || (destinationResult?.query === searchContext && destinationResult.error) || (showRoute && routeGeometry.coordinates === routeCoordinates ? routeGeometry.error : '');
  const cameraKey = searchedLocation ? `search:${searchedLocation.latitude},${searchedLocation.longitude}` :
    focusedLocation?.hasRealCoords ? `focus:${focusedLocation.lat},${focusedLocation.lng}` : routeCoordinates || (destinationLocation ? `destination:${destinationLocation.lat},${destinationLocation.lng}` : '');
  const viewportKey = (searchedLocation || destinationLocation || (!searchContext && routeCoordinates)) ? `${searchContext}|${cameraKey}` : '';

  return (
    <div className="trip-map">
      <div className="trip-map-search"><PlaceSearch searchPlaces={searchMapPlaces} placeholder="Tìm địa điểm trên bản đồ…" onSelect={place => setSearchResult({ context: searchContext, place })} /></div>
      <div className="trip-map-canvas">
      {mapMessage && <p role="alert" className="trip-map-error">{mapMessage}</p>}

      <MapContainer 
        center={center} 
        zoom={validLocations.length ? 13 : 6}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={geoapifyAttribution}
          url={geoapifyTileUrl}
          maxZoom={20}
          eventHandlers={{ tileerror: () => setMapError('Không tải được bản đồ Geoapify. Kiểm tra kết nối, khóa API và hạn mức.') }}
        />
        
        <ZoomControl position="bottomright" />
        <MapViewport coordinates={routeCoordinates} focusedLocation={focusedLocation} destinationLocation={destinationLocation} searchedLocation={searchedLocation} />
        <NearbyPlaces selectedLocations={validLocations} onLocationAdd={onLocationAdd} controlsElement={controlsElement} viewportKey={viewportKey} />
        {searchedLocation && <Marker position={[searchedLocation.latitude, searchedLocation.longitude]}>
          <Popup><strong>{searchedLocation.name}</strong><p>{searchedLocation.address}</p>{typeof onLocationAdd === 'function' && <button type="button" className="btn btn-primary" onClick={() => { onLocationAdd(searchedLocation); setSearchResult(null); }}>Thêm vào lịch trình</button>}</Popup>
        </Marker>}

        {validLocations.map((loc, idx) => (
          <Marker 
            key={loc.id || `loc_${idx}`} 
            position={[loc.lat, loc.lng]}
            {...(numberMarkers ? { icon: L.divIcon({ className: 'trip-map-number', html: `<span>${Number(loc.stopNumber) || idx + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) } : {})}
            eventHandlers={{
              click: () => fetchWeatherForLocation(loc.id, loc.lat, loc.lng)
            }}
          >
            <Popup>
              <div style={{ padding: '0.5rem' }}>
                <img src={loc.image || DESTINATION_PLACEHOLDER} onError={handleImageError} alt={loc.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{loc.name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>{loc.address}</p>
                
                {weatherData[loc.id] && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.5rem', 
                    background: '#f8fafc', 
                    borderRadius: '4px', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.8rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Thermometer size={14} color="var(--accent)" />
                      {weatherData[loc.id].temp}°C
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CloudRain size={14} color="var(--primary)" />
                      {weatherData[loc.id].condition}
                    </div>
                  </div>
                )}
                
                {typeof onLocationRemove === 'function' && (
                  <button 
                    onClick={() => onLocationRemove(loc.id)}
                    style={{ 
                      width: '100%', 
                      padding: '0.4rem', 
                      background: '#fee2e2', 
                      color: '#dc2626', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      borderRadius: '4px' 
                    }}
                  >
                    Xóa khỏi lịch trình
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {showRoute && routeGeometry.coordinates === routeCoordinates && routeGeometry.points.length > 0 && (
          <Polyline positions={routeGeometry.points} color="var(--primary)" weight={5} opacity={0.8} />
        )}
      </MapContainer>
      </div>
      <div className="trip-map-footer" ref={setControlsElement} />
    </div>
  );
};

export default MapComponent;
