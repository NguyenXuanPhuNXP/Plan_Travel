import React from 'react';
import Layout from '../components/Layout/Layout';
import { Settings } from 'lucide-react';

const SettingsPage = () => {
  return (
    <Layout>
      <div className="card" style={{ maxWidth: 900 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={24} /> Cài đặt
        </h1>
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
          Trang cài đặt đang được hoàn thiện. Hiện tại bạn có thể cập nhật hồ sơ tại trang Hồ sơ cá nhân.
        </p>
      </div>
    </Layout>
  );
};

export default SettingsPage;
