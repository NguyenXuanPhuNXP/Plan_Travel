import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../Components/Layout/Layout';
import TripSetupForm from '../Components/Layout/TripSetupForm';
import { useTrips } from '../context/TripContext';
import { itineraryService } from '../services/itineraryService';
import { locationService } from '../services/locationService';
import { friendService } from '../services/friendService';
import { tripSetupPayload } from '../utils/tripSetup';
import PlannerIntro from '../Components/Layout/PlannerIntro';
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
      await locationService.ensureDestination(payload.destination);
      const trip = await itineraryService.create(payload);
      addTrip(trip);
      navigate(`/trip/${trip.id}`);
    } catch (err) { setError(err.response?.data?.message || err.message || 'Chưa tạo được kế hoạch. Hãy thử lại.'); }
    finally { setSaving(false); }
  };
  return <Layout><div className="planner-start-layout planner-manual-page">
    <PlannerIntro destination={info.destination} manual />
    <form className="planner-start-form" onSubmit={startPlanning}>
      <header><h2>Bắt đầu hành trình</h2><p>Chọn thông tin chuyến đi trước khi sắp xếp điểm dừng.</p></header>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><TripSetupForm info={info} onChange={setInfo} friends={friends} selectedFriendIds={selectedFriendIds} onFriendsChange={setSelectedFriendIds} /></fieldset>
      {error && <p role="alert">{error}</p>}
      <footer><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />} {saving ? 'Đang tạo bản nháp…' : 'Bắt đầu lập lịch trình'}</button></footer>
    </form>
  </div></Layout>;
}
