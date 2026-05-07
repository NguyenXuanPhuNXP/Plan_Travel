import React from 'react';
import Layout from '../components/Layout/Layout';
import { Bell } from 'lucide-react';

const Notifications = () => {
  return (
    <Layout>
      <div className="card" style={{ maxWidth: 900 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={24} /> Thông báo
        </h1>
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
          Chưa có thông báo mới. Khi có cập nhật về lịch trình và chia sẻ kế hoạch, chúng sẽ hiển thị tại đây.
        </p>
      </div>
    </Layout>
  );
};

export default Notifications;
