import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMapEvents, 
  Polyline, 
  ZoomControl 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, Thermometer, CloudRain } from 'lucide-react';
import { WeatherService } from '../../services/WeatherService';

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

const MapEventsHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (typeof onMapClick === 'function' && e && e.latlng) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const MapComponent = ({ selectedLocations = [], onLocationAdd, onLocationRemove, showRoute = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [weatherData, setWeatherData] = useState({});

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
    : [21.0285, 105.8542]; // Default to Hanoi

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || typeof onLocationAdd !== 'function') return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onLocationAdd({
          id: `search_${Date.now()}`,
          name: display_name.split(',')[0],
          address: display_name,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'
        });
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchWeatherForLocation = async (id, lat, lng) => {
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || weatherData[id]) return;
    try {
      const data = await WeatherService.getWeather(lat, lng);
      setWeatherData(prev => ({ ...prev, [id]: data }));
    } catch {
      // silent
    }
  };

  const [routeGeometry, setRouteGeometry] = useState([]);

  // Depend on coordinate values, not a new array allocated on every render.
  const routeCoordinates = validLocations.map(loc => `${loc.lng},${loc.lat}`).join(';');

  useEffect(() => {
    const controller = new AbortController();
    setRouteGeometry(previous => previous.length ? [] : previous);
    if (!showRoute || !routeCoordinates.includes(';')) return;

    const fetchRoute = async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${routeCoordinates}?overview=full&geometries=geojson`;
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && data.routes?.[0]?.geometry?.coordinates) {
          setRouteGeometry(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Lỗi khi lấy lộ trình:', err);
      }
    };

    fetchRoute();
    return () => controller.abort();
  }, [routeCoordinates, showRoute]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Search Overlay */}
      {typeof onLocationAdd === 'function' && (
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 1000, 
          width: '90%', 
          maxWidth: '500px' 
        }}>
          <form onSubmit={handleSearch} className="glass" style={{ 
            display: 'flex', 
            padding: '0.5rem', 
            borderRadius: 'var(--radius-lg)', 
            boxShadow: 'var(--shadow-lg)' 
          }}>
            <input 
              type="text" 
              placeholder="Tìm địa điểm du lịch..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                flex: 1, 
                border: 'none', 
                background: 'transparent', 
                padding: '0.5rem 1rem', 
                fontSize: '0.9rem' 
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
              {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </form>
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={13} 
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ZoomControl position="bottomright" />
        <MapEventsHandler onMapClick={(latlng) => {
          if (typeof onLocationAdd === 'function') {
            onLocationAdd({
              id: `click_${Date.now()}`,
              name: `Địa điểm mới (${latlng.lat.toFixed(4)})`,
              address: `Vĩ độ: ${latlng.lat.toFixed(4)}, Kinh độ: ${latlng.lng.toFixed(4)}`,
              lat: latlng.lat,
              lng: latlng.lng,
              image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'
            });
          }
        }} />

        {validLocations.map((loc, idx) => (
          <Marker 
            key={loc.id || `loc_${idx}`} 
            position={[loc.lat, loc.lng]}
            eventHandlers={{
              click: () => fetchWeatherForLocation(loc.id, loc.lat, loc.lng)
            }}
          >
            <Popup>
              <div style={{ padding: '0.5rem' }}>
                <img src={loc.image} alt={loc.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />
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

        {showRoute && routeGeometry.length > 1 && (
          <Polyline positions={routeGeometry} color="var(--primary)" weight={5} opacity={0.8} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
