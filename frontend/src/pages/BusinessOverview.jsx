import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import './Business.css';
import { BusinessHeader, BusinessLinks, BusinessTimeFilter, EmptyState, useBusinessSelection, typeLabels } from './businessShared';

export default function BusinessOverview() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { businesses, businessId, dashboard, loading, error, setError, selectBusiness } = useBusinessSelection({ loadDashboard: true, ...range });
  return <Layout><div className="business-page">
    <BusinessHeader title="Tổng quan cơ sở" description="Theo dõi hoạt động, đánh giá và tình trạng xét duyệt." businesses={businesses} businessId={businessId} onBusinessChange={selectBusiness} />
    {businessId && <BusinessTimeFilter from={range.from} to={range.to} onRange={(from, to) => setRange({ from, to })} />}
    {error && <div className="business-alert" role="alert">{error} <button type="button" className="business-secondary-button" onClick={() => setError('')}>Thử lại</button></div>}
    {!loading && !businesses.length && <EmptyState title="Chưa có cơ sở được cấp quyền">Hãy mở Hồ sơ Business để đăng ký cơ sở mới hoặc xin quản lý cơ sở trong danh mục.</EmptyState>}
    {loading && <div className="business-loading" role="status">Đang tải dữ liệu cơ sở…</div>}
    {dashboard && <>
      <section className="business-section business-summary"><div><h2>{dashboard.business.name}</h2><p>{dashboard.business.address}</p></div><div className="business-statuses"><span className="business-badge">{dashboard.business.isActive ? 'Đang hoạt động' : 'Tạm ngừng'}</span><span className="business-badge">{typeLabels[dashboard.business.type] || dashboard.business.type}</span><span className="business-badge">Đã duyệt</span></div><BusinessLinks businessId={businessId} /></section>
      <section className="business-metrics" aria-label="Chỉ số tổng quan"><div><strong>{dashboard.stats.itineraryCount}</strong><span>Lịch trình có cơ sở</span></div><div><strong>{dashboard.stats.completedTripCount ?? 'Chưa có dữ liệu'}</strong><span>Chuyến hoàn thành</span></div><div><strong>{dashboard.stats.checkinCount ?? 'Chưa có dữ liệu'}</strong><span>Check-in hợp lệ</span></div><div><strong>{dashboard.stats.averageRating ?? 'Chưa có dữ liệu'}</strong><span>Điểm trung bình · {dashboard.stats.reviewCount || 0} đánh giá</span></div></section>
      {dashboard.trend?.length ? <section className="business-section"><div className="business-section-heading"><div><h2>Hoạt động theo thời gian</h2><p>Lịch trình, check-in và đánh giá trong khoảng đã chọn.</p></div><span className="business-legend">Lịch trình · Check-in · Đánh giá</span></div><div className="business-chart" aria-label="Biểu đồ hoạt động">{dashboard.trend.map(row => <div className="business-chart-column" key={row.date}><div className="business-chart-bars"><i className="itinerary" style={{ height: `${Math.max(4, row.itineraryCount * 10)}%` }} title={`${row.itineraryCount} lịch trình`} /><i className="checkin" style={{ height: `${Math.max(4, row.checkinCount * 10)}%` }} title={`${row.checkinCount} check-in`} /><i className="review" style={{ height: `${Math.max(4, row.reviewCount * 10)}%` }} title={`${row.reviewCount} đánh giá`} /></div><small>{row.date.slice(5)}</small></div>)}</div></section> : <EmptyState title="Chưa có dữ liệu biểu đồ">API hiện chưa trả dữ liệu theo ngày cho bộ lọc này.</EmptyState>}
      <section className="business-section"><div className="business-section-heading"><h2>Đánh giá gần đây</h2><a className="btn btn-outline" href={`/business/reviews?businessId=${businessId}`}>Xem tất cả</a></div>{dashboard.reviews?.length ? dashboard.reviews.slice(0, 3).map(review => <article className="business-review" key={review.id}><strong>{review.author?.name || 'Khách'} · {review.rating}/5</strong><span>{review.verifiedVisit ? 'Đã xác nhận ghé thăm' : 'Đánh giá chưa xác nhận check-in'}</span><p>{review.content}</p></article>) : <EmptyState title="Chưa có đánh giá">Đánh giá sẽ xuất hiện sau khi khách check-in hợp lệ.</EmptyState>}</section>
    </>}
  </div></Layout>;
}
