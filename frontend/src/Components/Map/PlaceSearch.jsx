import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchTripPlaces } from '../../services/tripPlaceSearch';
import './PlaceSearch.css';

export default function PlaceSearch({ onSelect, context = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const search = async event => {
    event.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true); setMessage(''); setResults([]);
    try {
      const places = await searchTripPlaces(query, context);
      setResults(places);
      if (!places.length) setMessage('Chưa tìm thấy địa điểm. Thử tên cụ thể hơn hoặc nhập thủ công.');
    } catch (error) { setMessage(error.message || 'Không thể tìm kiếm. Hãy thử lại.'); }
    finally { setLoading(false); }
  };
  return <div className="trip-place-search">
    <form onSubmit={search}><Search size={17} /><input aria-label="Nhập điểm đến" placeholder="Nhập điểm đến…" value={query} onChange={event => { setQuery(event.target.value); setResults([]); setMessage(''); }} /><button type="submit" aria-label="Tìm địa điểm" disabled={loading || !query.trim()}>{loading ? <Loader2 size={17} className="animate-spin" /> : 'Tìm'}</button></form>
    {message && <p role="status">{message}</p>}
    {results.length > 0 && <ul aria-label="Kết quả tìm địa điểm">{results.map(place => <li key={place.id}><button type="button" onClick={() => { onSelect(place); setQuery(''); setResults([]); }}><MapPin size={17} /><span><strong>{place.name}</strong><small>{place.address || place.region || 'Chưa có địa chỉ'}</small></span></button></li>)}</ul>}
  </div>;
}
