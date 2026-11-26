import { COST_LABELS, aiPlanCosts } from '../utils/aiPlanDetails';

export default function AiPlanOverview({ plan, budget, showCosts = true }) {
  if (!plan) return null;
  const costs = aiPlanCosts(plan);
  return <section className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }} aria-label="Tư vấn chuyến đi">
    <h2>Thông tin chuyến đi</h2>
    {plan.generationMethod === 'sample' && <p role="status"><strong>Dữ liệu mẫu để kiểm tra giao diện</strong> · Chưa kết nối API AI. Giá, địa điểm và thời tiết chỉ mang tính minh họa.</p>}
    <h3>Phương tiện</h3><p>{plan.transport || 'Chưa có đề xuất phương tiện. Hãy kiểm tra điểm xuất phát và các tuyến đi.'}</p>
    <h3>Nơi lưu trú</h3><p>{plan.accommodation || 'Chưa có đề xuất lưu trú được xác nhận.'}</p>
    {plan.recommendedStopsPerDay && <p className="ai-plan-recommendation"><strong>Gợi ý nhịp lịch:</strong> khoảng {plan.recommendedStopsPerDay} điểm hoạt động mỗi ngày, chưa tính nơi lưu trú.</p>}
    {showCosts && <><h3>Phân bổ chi phí cả nhóm</h3>
    {budget != null && <p>Ngân sách: {budget.toLocaleString('vi-VN')} VNĐ cho toàn bộ chuyến đi.</p>}
    {plan.costAllocation ? <><p>Ước tính cho cả nhóm, cần kiểm tra giá trước khi đặt dịch vụ.</p><dl>{Object.entries(COST_LABELS).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{plan.costAllocation[key] == null ? 'Chưa có dữ liệu giá' : `${Number(plan.costAllocation[key]).toLocaleString('vi-VN')} VNĐ`}</dd></div>)}</dl>{costs.totalCost == null ? <p role="status">Chưa đủ dữ liệu để xác định tổng chính xác. Đã có dữ liệu tối thiểu {Number(plan.costSummary?.knownSubtotal || 0).toLocaleString('vi-VN')} VNĐ.</p> : <p><strong>Tổng dự kiến: {costs.totalCost.toLocaleString('vi-VN')} VNĐ</strong></p>}{budget != null && costs.totalCost != null && costs.totalCost > budget && <p role="alert">Chi phí dự kiến vượt tổng ngân sách. Cần giảm dịch vụ hoặc điều chỉnh chuyến đi.</p>}</> : <p>Chưa có phân bổ chi phí. Ngân sách bạn nhập là giới hạn cho toàn bộ chuyến đi.</p>}
    </>}
    {plan.costSummary && <p><strong>Tổng chuyến đi:</strong> {plan.costSummary.total == null ? 'Chưa đủ dữ liệu giá' : `${Number(plan.costSummary.total).toLocaleString('vi-VN')} VNĐ · Bình quân ${Number(plan.costSummary.perPerson || 0).toLocaleString('vi-VN')} VNĐ/người`}</p>}
    {plan.costBreakdown?.length > 0 && <details><summary>Cách tính từng khoản</summary><ul>{plan.costBreakdown.map((line, index) => <li key={`${line.category}-${index}`}>{line.description}: {line.unitPrice == null ? 'chưa có đơn giá' : `${Number(line.unitPrice).toLocaleString('vi-VN')} VNĐ/đơn vị`} · {line.costType === 'PERSON' ? `× ${line.quantity ?? 1} đơn vị × ${plan.travelerCount || 1} người` : line.costType === 'ROOM' ? (line.capacity ? `× ${Math.ceil((plan.travelerCount || 1) / line.capacity)} phòng × ${line.nights ?? 'chưa rõ'} đêm (sức chứa ${line.capacity}/phòng)` : 'chưa có dữ liệu sức chứa phòng') : line.costType === 'FIXED' ? 'phí cố định, không nhân số người' : `× ${line.quantity ?? 1} đơn vị nhóm`} = {line.totalCost == null ? 'chưa xác định' : `${Number(line.totalCost).toLocaleString('vi-VN')} VNĐ`}{line.isEstimated && ' (ước tính)'}</li>)}</ul></details>}
    {plan.costSummary?.daily?.length > 0 && <details><summary>Chi phí ước tính theo ngày</summary><ul>{plan.costSummary.daily.map(day => <li key={day.dayNumber}>Ngày {day.dayNumber}: {day.total == null ? `chưa đủ dữ liệu giá${day.unknownCategories?.length ? ` (${day.unknownCategories.map(key => COST_LABELS[key] || key).join(', ')})` : ''}` : `${Number(day.total).toLocaleString('vi-VN')} VNĐ`}</li>)}</ul></details>}
    <h3>Thời tiết</h3><p>{plan.weather || 'Chưa có dự báo xác thực cho ngày đi. Kiểm tra dự báo gần ngày khởi hành; chuẩn bị phương án hoạt động trong nhà khi mưa.'}</p>
    <h3>Rủi ro và phương án xử lý</h3><ul>{(plan.risks?.length ? plan.risks : ['Kiểm tra giá, giờ mở cửa và tình trạng đặt chỗ trước khi đi.', 'Dự phòng thời gian di chuyển và phương án thay thế khi thời tiết xấu.']).map((risk, i) => <li key={i}>{risk}</li>)}</ul>
  </section>;
}
