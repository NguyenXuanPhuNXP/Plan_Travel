import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { sharingService } from '../services/sharingService';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { useNotifications } from '../context/NotificationContext';
import './GroupInvite.css';

const GroupInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchTrips } = useTrips();
  const { pushNotification } = useNotifications();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const data = await sharingService.getInviteInfo(token);
        setInvite(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Link mời không tồn tại hoặc đã bị khóa.');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=/group-invite/${token}`);
      return;
    }

    setJoining(true);
    try {
      const data = await sharingService.joinInvite(token);
      await fetchTrips();
      pushNotification({
        id: `group_joined_${data.itinerary.id}_${Date.now()}`,
        type: 'group',
        title: data.alreadyJoined ? 'Bạn đã ở trong nhóm kế hoạch' : 'Đã tham gia nhóm kế hoạch',
        message: `Bạn có thể theo dõi kế hoạch "${data.itinerary.name}" trong lịch sử chuyến đi.`
      });
      navigate(`/trip/${data.itinerary.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tham gia nhóm kế hoạch.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="group-invite-page">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="group-invite-page">
      <div className="card group-invite-card">
        <div className="group-invite-icon"><Users size={28} /></div>
        {error ? (
          <>
            <h1>Link mời không khả dụng</h1>
            <p>{error}</p>
            <Link to="/" className="btn btn-primary">Về trang chính</Link>
          </>
        ) : (
          <>
            <h1>Tham gia nhóm kế hoạch</h1>
            <p className="group-invite-plan">{invite.name}</p>
            <p>
              Trưởng nhóm: <strong>{invite.owner?.name || 'Chủ kế hoạch'}</strong>
              {invite.destination ? ` · ${invite.destination}` : ''}
            </p>
            <p className="group-invite-muted">
              Khi tham gia, bạn sẽ có quyền xem kế hoạch. Trưởng nhóm có thể cấp quyền chỉnh sửa sau.
            </p>
            <button className="btn btn-primary group-invite-action" onClick={handleJoin} disabled={joining}>
              {joining ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              Tham gia nhóm
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupInvite;
