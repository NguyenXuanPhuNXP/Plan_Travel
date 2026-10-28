import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fee2e2',
            padding: '1rem',
            borderRadius: '50%',
            marginBottom: '1rem',
            display: 'inline-flex'
          }}>
            <AlertTriangle size={36} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
            Đã xảy ra sự cố khi tải trang
          </h2>
          <p style={{ color: '#64748b', maxWidth: 450, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {this.state.error?.message || 'Có lỗi ngoài dự kiến trong giao diện. Vui lòng tải lại trang hoặc quay về trang chủ.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={16} /> Tải lại trang
            </button>
            <a
              href="/"
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Home size={16} /> Về trang chủ
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
