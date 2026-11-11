import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, MapPin } from 'lucide-react';
import Layout from '../Components/Layout/Layout';
import TripSetupForm from '../Components/Layout/TripSetupForm';
import { useTrips } from '../context/TripContext';
import { itineraryService } from '../services/itineraryService';
import { friendService } from '../services/friendService';
import { tripSetupPayload } from '../utils/tripSetup';
import './TripWorkspace.css';

export default function TripPlanner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addTrip } = useTrips();
  const [info, setInfo] = useState({ name: '', destination: params.get('destination') || '', startDate: '', endDate: '', travelerCount: 1, transportMode: '', preferences: [] });
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { friendService.getFriends().then(setFriends).catch(() => {}); }, []);
  const startPlanning = async event => {
    event.preventDefault();
    if (saving) return;
    setError('');
    try {
      const payload = tripSetupPayload(info, selectedFriendIds);
      setSaving(true);
      const trip = await itineraryService.create(payload);
      addTrip(trip);
      navigate(`/trip/${trip.id}`);
    } catch (err) { setError(err.response?.data?.message || err.message || 'Chưa tạo được kế hoạch. Hãy thử lại.'); }
    finally { setSaving(false); }
  };
  return <Layout><div className="trip-setup-page">
    <header><Link to="/" className="trip-details-header-link"><ArrowLeft size={16} /> Quay lại</Link><h1>Chuyến đi của bạn</h1><p>Chọn nơi muốn đi, thời gian và những người cùng lên kế hoạch.</p></header>
    <nav className="trip-workspace-tabs" aria-label="Các bước lập kế hoạch"><button type="button" aria-current="step" className="active"><MapPin size={16} /> Thông tin chuyến đi</button><button type="button" disabled><ArrowRight size={16} /> Lịch trình theo ngày</button></nav>
    <form onSubmit={startPlanning}>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><TripSetupForm info={info} onChange={setInfo} friends={friends} selectedFriendIds={selectedFriendIds} onFriendsChange={setSelectedFriendIds} /></fieldset>
      {error && <p role="alert">{error}</p>}
      <footer><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />} {saving ? 'Đang tạo bản nháp…' : 'Bắt đầu lập lịch trình'}</button></footer>
    </form>
  </div></Layout>;
}
