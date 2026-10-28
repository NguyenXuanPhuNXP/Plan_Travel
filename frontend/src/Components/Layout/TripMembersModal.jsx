import { useEffect, useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { sharingService } from '../../services/sharingService';
import { friendService } from '../../services/friendService';
import './FriendModal.css';

export default function TripMembersModal({ trip, userId, onClose, onUpdated }) {
  const [group, setGroup] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isOwner = String(trip.userId || trip.owner?.id) === String(userId);
  useEffect(() => {
    let active = true;
    Promise.all([sharingService.getGroupMembers(trip.id), isOwner ? friendService.getFriends() : Promise.resolve([])])
      .then(([members, contacts]) => { if (active) { setGroup(members); setFriends(contacts); } })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Không thể tải thành viên.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trip.id, isOwner]);
  const addMember = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await sharingService.addCollaborator(trip.id, { userId: selectedId || undefined, email: selectedId ? undefined : email.trim(), permission });
      setGroup(updated);
      setSelectedId('');
      setEmail('');
      await onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thêm thành viên.');
    } finally { setSaving(false); }
  };
  const existingIds = new Set([String(group?.owner?.id), ...(group?.members || []).map(member => String(member.userId))]);
  return <div className="friend-modal-overlay" onClick={() => { if (!saving) onClose(); }}>
    <div className="friend-modal-card" role="dialog" aria-modal="true" aria-label="Thành viên kế hoạch" onClick={event => event.stopPropagation()}>
      <div className="friend-modal-header">
        <h2 className="friend-modal-title">Thành viên: {trip.title || trip.name}</h2>
        <button className="friend-modal-close" onClick={onClose} disabled={saving} aria-label="Đóng"><X size={20} /></button>
      </div>
      <div className="friend-modal-body">
        {error && <p role="alert">{error}</p>}
        {loading ? <Loader2 className="animate-spin" /> : <>
          {group?.owner && <p>{group.owner.name} — Chủ kế hoạch</p>}
          {(group?.members || []).map(member => <p key={member.userId}>{member.user?.name || member.user?.email} — {member.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}</p>)}
          {isOwner && group && <form onSubmit={addMember} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            <label>Chọn bạn bè
              <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="friend-search-input" disabled={saving}>
                <option value="">Nhập email hoặc chọn một người bạn</option>
                {friends.filter(friend => !existingIds.has(String(friend.id))).map(friend => <option key={friend.id} value={friend.id}>{friend.fullName || friend.name} ({friend.email})</option>)}
              </select>
            </label>
            {!selectedId && <label>Email thành viên<input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={saving} className="friend-search-input" /></label>}
            <label>Quyền truy cập<select value={permission} onChange={event => setPermission(event.target.value)} disabled={saving} className="friend-search-input"><option value="view">Chỉ xem</option><option value="edit">Chỉnh sửa</option></select></label>
            <button type="submit" className="btn btn-primary" disabled={saving || (!selectedId && !email.trim())}>{saving ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Thêm thành viên</button>
          </form>}
        </>}
      </div>
    </div>
  </div>;
}
