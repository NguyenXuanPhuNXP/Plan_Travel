import { COST_LABELS, aiPlanCosts } from '../utils/aiPlanDetails';

export default function AiPlanOverview({ plan, budget }) {
  if (!plan) return null;
  const costs = aiPlanCosts(plan);
  return <section className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }} aria-label="Tư vấn chuyến đi">
    <h2>Thông tin chuyến đi</h2>
    {plan.generationMethod === 'sample' && <p role="status"><strong>Dữ liệu mẫu để kiểm tra giao diện</strong> · Chưa kết nối API AI. Giá, địa điểm và thời tiết chỉ mang tính minh họa.</p>}
    <h3>Phương tiện</h3><p>{plan.transport || 'Chưa có đề xuất phương tiện. Hãy kiểm tra điểm xuất phát và các tuyến đi.'}</p>
    <h3>Nơi lưu trú</h3><p>{plan.accommodation || 'Chưa có đề xuất lưu trú được xác nhận.'}</p>
    <h3>Phân bổ chi phí cả nhóm</h3>
    {budget != null && <p>Ngân sách: {budget.toLocaleString('vi-VN')} VNĐ cho toàn bộ chuyến đi.</p>}
    {plan.costAllocation ? <><p>Ước tính, cần kiểm tra giá trước khi đặt dịch vụ.</p><dl>{Object.entries(COST_LABELS).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{Number(plan.costAllocation[key] || 0).toLocaleString('vi-VN')} VNĐ</dd></div>)}</dl><p><strong>Tổng dự kiến: {costs.totalCost.toLocaleString('vi-VN')} VNĐ</strong></p>{budget != null && costs.totalCost > budget && <p role="alert">Chi phí dự kiến vượt tổng ngân sách. Cần giảm dịch vụ hoặc điều chỉnh chuyến đi.</p>}</> : <p>Chưa có phân bổ chi phí. Ngân sách bạn nhập là giới hạn cho toàn bộ chuyến đi.</p>}
    <h3>Thời tiết</h3><p>{plan.weather || 'Chưa có dự báo xác thực cho ngày đi. Kiểm tra dự báo gần ngày khởi hành; chuẩn bị phương án hoạt động trong nhà khi mưa.'}</p>
    <h3>Rủi ro và phương án xử lý</h3><ul>{(plan.risks?.length ? plan.risks : ['Kiểm tra giá, giờ mở cửa và tình trạng đặt chỗ trước khi đi.', 'Dự phòng thời gian di chuyển và phương án thay thế khi thời tiết xấu.']).map((risk, i) => <li key={i}>{risk}</li>)}</ul>
  </section>;
}
