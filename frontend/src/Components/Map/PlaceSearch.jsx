import { useEffect, useId, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchTripPlaces } from '../../services/tripPlaceSearch';
import './PlaceSearch.css';

export default function PlaceSearch({ onSelect, context = '', placeholder = 'Nhập điểm đến…', searchPlaces = searchTripPlaces }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const places = await searchPlaces(query, context, controller.signal);
        if (controller.signal.aborted) return;
        setResults(places); setActive(-1);
        setMessage(places.length ? '' : 'Chưa tìm thấy địa điểm. Thử tên cụ thể hơn.');
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error.message || 'Không thể tìm kiếm. Hãy thử lại.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, context, open, request, searchPlaces]);
  const select = place => { setOpen(false); setLoading(false); setQuery(place.name); setResults([]); setMessage(''); onSelect(place); };
  return <div className="trip-place-search">
    <form onSubmit={event => { event.preventDefault(); setOpen(true); setRequest(value => value + 1); }}>
      <Search size={17} />
      <input aria-label={placeholder} role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off" placeholder={placeholder} value={query} onChange={event => { setQuery(event.target.value); setOpen(true); setLoading(false); setResults([]); setActive(-1); setMessage(''); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setLoading(false); }
          if (open && results.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length); }
          if (open && event.key === 'Enter' && active >= 0 && results[active]) { event.preventDefault(); select(results[active]); }
        }} />
      <button type="submit" aria-label="Tìm địa điểm" disabled={loading || query.trim().length < 2}>{loading ? <Loader2 size={17} className="animate-spin" /> : 'Tìm'}</button>
    </form>
    {open && message && <p role="status">{message}</p>}
    {open && results.length > 0 && <ul id={listId} role="listbox" aria-label="Kết quả tìm địa điểm">{results.map((place, index) => <li key={place.id} id={`${listId}-${index}`} role="option" aria-selected={active === index}><button type="button" onClick={() => select(place)}><MapPin size={17} /><span><strong>{place.name}</strong><small>{place.address || place.region || 'Chưa có địa chỉ'}</small></span></button></li>)}</ul>}
  </div>;
}
