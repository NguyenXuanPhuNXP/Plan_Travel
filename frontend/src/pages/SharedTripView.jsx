import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Calendar, Clock, DollarSign, User, 
  Share2, Copy, Check, Loader2, AlertTriangle,
  Navigation, StickyNote
} from 'lucide-react';
import { sharingService } from '../services/sharingService';
import './SharedTripView.css';

const SharedTripView = () => {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSharedTrip();
  }, [token]);

  const loadSharedTrip = async () => {
    try {
      const data = await sharingService.getShared(token);
      setTrip(data);
    } catch (err) {
      setError('Lịch trình không tồn tại hoặc đã hết hạn chia sẻ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="shared-loading">
        <Loader2 className="animate-spin" size={48} />
        <p>Đang tải lịch trình...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="shared-error">
        <AlertTriangle size={48} />
        <h2>Không thể xem lịch trình</h2>
        <p>{error}</p>
        <Link to="/login" className="btn btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="shared-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shared-header"
      >
        <div className="shared-brand">
          <Link to="/" className="shared-brand-link">
            Travel<span>Plan</span>
          </Link>
        </div>

        <button onClick={handleCopyLink} className="btn btn-outline shared-copy-btn">
          {copied ? <><Check size={16} /> Đã sao chép</> : <><Copy size={16} /> Sao chép link</>}
        </button>
      </motion.div>

      {/* Trip Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card shared-hero"
      >
        <div className="shared-hero-gradient" />
        <div className="shared-hero-content">
          <div className="shared-badge">
            <Share2 size={14} /> Lịch trình công khai
          </div>
          <h1 className="shared-title">{trip.name}</h1>
          {trip.description && <p className="shared-desc">{trip.description}</p>}
          
          <div className="shared-meta">
            {trip.destination && (
              <span><MapPin size={16} /> {trip.destination}</span>
            )}
            {trip.totalDays && (
              <span><Calendar size={16} /> {trip.totalDays} ngày</span>
            )}
            {trip.budget && (
              <span><DollarSign size={16} /> {Number(trip.budget).toLocaleString()} VNĐ</span>
            )}
            <span><Navigation size={16} /> {trip.items?.length || 0} điểm dừng</span>
          </div>

          {trip.owner && (
            <div className="shared-owner">
              <div className="shared-owner-avatar">
                {trip.owner.avatar ? (
                  <img src={trip.owner.avatar} alt={trip.owner.name} />
                ) : (
                  <User size={18} />
                )}
              </div>
              <div>
                <div className="shared-owner-name">Bởi {trip.owner.name}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="shared-timeline">
        <h2 className="shared-section-title">
          <Clock size={20} /> Lịch trình chi tiết
        </h2>

        <div className="shared-timeline-list">
          <div className="shared-timeline-line" />
          
          {trip.items?.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="shared-timeline-item"
            >
              <div className="shared-timeline-dot">
                <span>{idx + 1}</span>
              </div>

              <div className="card shared-timeline-card">
                <div className="shared-timeline-card-content">
                  <h3 className="shared-timeline-name">
                    <MapPin size={16} />
                    {item.location?.name || 'Địa điểm'}
                  </h3>

                  {item.location?.address && (
                    <p className="shared-timeline-address">{item.location.address}</p>
                  )}

                  <div className="shared-timeline-tags">
                    {item.startTime && (
                      <span className="shared-tag">
                        <Clock size={12} /> {new Date(item.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {item.endTime && ` → ${new Date(item.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                    {item.location?.estimatedCost > 0 && (
                      <span className="shared-tag">
                        💰 {Number(item.location.estimatedCost).toLocaleString()}đ
                      </span>
                    )}
                    {item.location?.suggestedDuration && (
                      <span className="shared-tag">
                        ⏰ {item.location.suggestedDuration}
                      </span>
                    )}
                    {item.travelMinutes > 0 && (
                      <span className="shared-tag shared-tag-travel">
                        🚗 {item.travelMinutes} phút đến điểm tiếp
                      </span>
                    )}
                  </div>

                  {item.note && (
                    <div className="shared-timeline-note">
                      <StickyNote size={14} /> {item.note}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="shared-footer">
        <p>Bạn muốn tạo lịch trình riêng?</p>
        <Link to="/register" className="btn btn-primary">Đăng ký miễn phí</Link>
      </div>
    </div>
  );
};

export default SharedTripView;
