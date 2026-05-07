import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { TRENDING_DESTINATIONS } from '../utils/mockData';

const Explore = () => {
  return (
    <Layout>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Khám phá điểm đến</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Gợi ý các điểm nổi bật để bắt đầu tạo kế hoạch nhanh.
        </p>
        <div className="dashboard-trending-grid">
          {TRENDING_DESTINATIONS.map((dest) => (
            <Link key={dest.id} to="/planner" className="card dashboard-trending-card">
              <img
                src={dest.image}
                alt={dest.name}
                className="dashboard-trending-img"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800';
                }}
              />
              <div className="dashboard-trending-overlay">
                <h3 className="dashboard-trending-title">{dest.name}</h3>
                <div className="dashboard-trending-desc">{dest.trips}+ lượt lên kế hoạch</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Explore;
