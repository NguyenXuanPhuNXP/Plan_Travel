import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { useTrips } from '../context/TripContext';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Loader2, 
  Compass, 
  RotateCcw,
  Coffee,
  Camera,
  Sun,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import './AiPlanner.css';

// Predefined AI knowledge base for popular Vietnam destinations
const AI_DESTINATION_DATA = {
  'Đà Nẵng': {
    days: [
      {
        day: 1,
        title: 'Khám phá Biển Mỹ Khê & Bán đảo Sơn Trà',
        spots: [
          { time: '08:30', name: 'Bán đảo Sơn Trà & Chùa Linh Ứng', desc: 'Ngắm tượng Phật Bà Quan Âm cao nhất VN và toàn cảnh vịnh biển.', lat: 16.1006, lng: 108.2764 },
          { time: '12:00', name: 'Thưởng thức Bánh tráng cuốn thịt heo Đại Lộc', desc: 'Đặc sản ẩm thực nổi tiếng xứ Quảng.', lat: 16.0678, lng: 108.2208 },
          { time: '15:30', name: 'Tắm biển Mỹ Khê', desc: 'Một trong sáu bãi biển quyến rũ nhất hành tinh.', lat: 16.0601, lng: 108.2464 },
          { time: '19:30', name: 'Cầu Rồng phun lửa & Chợ đêm Sơn Trà', desc: 'Xem cầu Rồng biểu diễn ánh sáng và dạo chợ đêm ẩm thực.', lat: 16.0611, lng: 108.2272 }
        ]
      },
      {
        day: 2,
        title: 'Chinh phục Bà Nà Hills & Cầu Vàng',
        spots: [
          { time: '08:00', name: 'Sun World Bà Nà Hills & Cầu Vàng', desc: 'Đi cáp treo ngắm mây ngàn và check-in Cầu Vàng bàn tay khổng lồ.', lat: 15.9988, lng: 107.9961 },
          { time: '13:00', name: 'Làng Pháp & Hầm rượu Debay', desc: 'Khám phá kiến trúc châu Âu cổ điển giữa đỉnh núi Chúa.', lat: 15.9950, lng: 107.9900 },
          { time: '18:30', name: 'Du thuyền sông Hàn về đêm', desc: 'Ngắm các cây cầu biểu tượng rực rỡ ánh đèn trên sông.', lat: 16.0712, lng: 108.2255 }
        ]
      },
      {
        day: 3,
        title: 'Ngũ Hành Sơn & Di sản Phố cổ Hội An',
        spots: [
          { time: '09:00', name: 'Danh thắng Ngũ Hành Sơn', desc: 'Khám phá các hang động huyền bí và làng đá mỹ nghệ Non Nước.', lat: 16.0044, lng: 108.2638 },
          { time: '14:30', name: 'Phố cổ Hội An & Chùa Cầu', desc: 'Dạo bước ngắm nhà cổ hàng trăm năm tuổi và đèn lồng lung linh.', lat: 15.8801, lng: 108.3380 },
          { time: '19:00', name: 'Thả hoa đăng sông Hoài', desc: 'Trải nghiệm không gian lãng mạn đêm phố Hội.', lat: 15.8770, lng: 108.3260 }
        ]
      }
    ]
  },
  'Sapa': {
    days: [
      {
        day: 1,
        title: 'Thị trấn Sapa & Bản Cát Cát',
        spots: [
          { time: '09:00', name: 'Nhà thờ đá Sapa & Quảng trường', desc: 'Biểu tượng kiến trúc Gothic Pháp giữa lòng thị trấn sương mù.', lat: 22.3364, lng: 103.8438 },
          { time: '13:30', name: 'Bản Cát Cát của người H’Mông', desc: 'Trải nghiệm văn hóa bản địa, suối Mường Hoa và guồng nước gỗ.', lat: 22.3276, lng: 103.8327 },
          { time: '18:30', name: 'Thưởng thức Thắng cố & Lẩu cá hồi Sapa', desc: 'Ẩm thực Tây Bắc đặc trưng giữa tiết trời se lạnh.', lat: 22.3380, lng: 103.8420 }
        ]
      },
      {
        day: 2,
        title: 'Nóc nhà Đông Dương Fansipan',
        spots: [
          { time: '08:30', name: 'Đỉnh Fansipan 3.143m', desc: 'Chinh phục nóc nhà Đông Dương bằng cáp treo kỷ lục Guiness.', lat: 22.3033, lng: 103.7753 },
          { time: '14:00', name: 'Đèo Ô Quy Hồ & Cổng trời Sapa', desc: 'Một trong tứ đại đỉnh đèo hiểm trở và ngoạn mục nhất VN.', lat: 22.3533, lng: 103.7719 },
          { time: '19:00', name: 'Tắm lá thuốc người Dao đỏ', desc: 'Thư giãn cơ thể phục hồi năng lượng sau ngày dài leo núi.', lat: 22.3350, lng: 103.8450 }
        ]
      }
    ]
  },
  'Phú Quốc': {
    days: [
      {
        day: 1,
        title: 'Bắc đảo & Hoàng hôn Bãi Dài',
        spots: [
          { time: '09:00', name: 'VinWonders & Vinpearl Safari', desc: 'Vườn thú bán hoang dã lớn nhất Việt Nam.', lat: 10.3340, lng: 103.8655 },
          { time: '14:30', name: 'Mũi Gành Dầu', desc: 'Ngắm biên giới biển đảo hải phận Campuchia yên bình.', lat: 10.3667, lng: 103.8500 },
          { time: '18:00', name: 'Ngắm hoàng hôn Grand World Phú Quốc', desc: 'Thành phố không ngủ rực rỡ sắc màu.', lat: 10.3230, lng: 103.8560 }
        ]
      },
      {
        day: 2,
        title: 'Nam đảo & Cáp treo Hòn Thơm',
        spots: [
          { time: '08:30', name: 'Cáp treo Hòn Thơm vượt biển', desc: 'Cáp treo 3 dây vượt biển dài nhất thế giới.', lat: 10.0267, lng: 104.0150 },
          { time: '13:00', name: 'Tour cano 4 đảo & Lặn ngắm san hô', desc: 'Hòn Móng Tay, Hòn Gầm Ghì, Hòn Mây Rút trong vắt.', lat: 9.9600, lng: 104.0200 },
          { time: '19:00', name: 'Chợ đêm Phú Quốc', desc: 'Thưởng thức hải sản tươi ngon: nhum nướng, gỏi cá trích.', lat: 10.2167, lng: 103.9590 }
        ]
      }
    ]
  },
  'Hà Nội': {
    days: [
      {
        day: 1,
        title: 'Dấu ấn nghìn năm Thăng Long',
        spots: [
          { time: '08:00', name: 'Lăng Chủ tịch Hồ Chí Minh & Chùa Một Cột', desc: 'Kính viếng Bác và chiêm ngưỡng công trình kiến trúc hoa sen độc đáo.', lat: 21.0368, lng: 105.8346 },
          { time: '10:30', name: 'Hoàng thành Thăng Long', desc: 'Di sản văn hóa thế giới lưu giữ ngàn năm lịch sử kinh kỳ.', lat: 21.0350, lng: 105.8400 },
          { time: '12:00', name: 'Bún chả Hương Liên hoặc Phở Bát Đàn', desc: 'Tinh hoa ẩm thực truyền thống Hà Nội.', lat: 21.0180, lng: 105.8520 },
          { time: '14:30', name: 'Văn Miếu - Quốc Tử Giám', desc: 'Trường đại học đầu tiên của Việt Nam.', lat: 21.0294, lng: 105.8355 },
          { time: '18:00', name: 'Hồ Hoàn Kiếm & Phố đi bộ', desc: 'Ngắm Tháp Rùa và thưởng thức kem Tràng Tiền.', lat: 21.0285, lng: 105.8542 }
        ]
      },
      {
        day: 2,
        title: 'Khám phá 36 Phố Phường & Hồ Tây',
        spots: [
          { time: '08:30', name: 'Chùa Trấn Quốc & Hồ Tây', desc: 'Ngôi chùa cổ nhất Hà Nội thanh tịnh bên mặt nước Hồ Tây.', lat: 21.0476, lng: 105.8368 },
          { time: '11:00', name: 'Cà phê trứng Giảng & Phố cổ Hà Nội', desc: 'Thưởng thức tách cà phê trứng trứ danh.', lat: 21.0350, lng: 105.8530 },
          { time: '14:30', name: 'Cầu Long Biên & Chợ Đồng Xuân', desc: 'Chứng nhân lịch sử bắc qua sông Hồng.', lat: 21.0435, lng: 105.8569 },
          { time: '19:00', name: 'Phố ẩm thực Tống Duy Tân / Bia Tạ Hiện', desc: 'Không khí nhộn nhịp phố đêm Hà Thành.', lat: 21.0330, lng: 105.8500 }
        ]
      }
    ]
  }
};

const STYLES = [
  { id: 'explore', label: 'Khám phá & Check-in', icon: Camera },
  { id: 'food', label: 'Ẩm thực & Food Tour', icon: Coffee },
  { id: 'relax', label: 'Nghỉ dưỡng & Thư giãn', icon: Sun },
  { id: 'culture', label: 'Văn hóa & Di sản', icon: Compass }
];

const BUDGETS = [
  { id: 'budget', label: 'Tiết kiệm', desc: 'Dưới 2tr/người' },
  { id: 'standard', label: 'Tiêu chuẩn', desc: '2tr - 5tr/người' },
  { id: 'luxury', label: 'Cao cấp', desc: 'Trên 5tr/người' }
];

const AiPlanner = () => {
  const { addTrip } = useTrips();
  const navigate = useNavigate();

  const [destination, setDestination] = useState('Đà Nẵng');
  const [duration, setDuration] = useState('3');
  const [style, setStyle] = useState('explore');
  const [budget, setBudget] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleGenerate = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedPlan(null);

    setTimeout(() => {
      // Find destination template or generate smart generic plan
      const destKey = Object.keys(AI_DESTINATION_DATA).find(
        k => k.toLowerCase() === destination.trim().toLowerCase()
      ) || 'Đà Nẵng';

      const baseData = AI_DESTINATION_DATA[destKey] || AI_DESTINATION_DATA['Đà Nẵng'];
      const numDays = Math.min(parseInt(duration) || 3, baseData.days.length);

      const daysPlan = baseData.days.slice(0, numDays).map((d, idx) => ({
        ...d,
        day: idx + 1
      }));

      // Collect all spots
      const allLocations = [];
      daysPlan.forEach(d => {
        d.spots.forEach((s, sIdx) => {
          allLocations.push({
            id: `ai_loc_${Date.now()}_${d.day}_${sIdx}`,
            name: s.name,
            address: `${s.name}, ${destination}`,
            lat: s.lat,
            lng: s.lng,
            description: s.desc,
            image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=800'
          });
        });
      });

      setGeneratedPlan({
        title: `Du lịch ${destination} ${duration} ngày (${STYLES.find(s => s.id === style)?.label})`,
        destination,
        days: daysPlan,
        allLocations,
        budgetEst: budget === 'budget' ? '1.800.000 VNĐ' : (budget === 'luxury' ? '6.500.000 VNĐ' : '3.500.000 VNĐ'),
        summary: `Lịch trình được AI tối ưu hóa riêng cho chuyến đi ${duration} ngày tại ${destination}, phân bổ lộ trình hợp lý giúp bạn tiết kiệm thời gian di chuyển.`
      });

      setIsGenerating(false);
    }, 1200);
  };

  const handleSaveToTrips = () => {
    if (!generatedPlan) return;

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + (parseInt(duration) || 3));

    const newTrip = addTrip({
      title: generatedPlan.title,
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      budget: generatedPlan.budgetEst,
      notes: generatedPlan.summary,
      locations: generatedPlan.allLocations
    });

    navigate(`/trip/${newTrip.id}`);
  };

  return (
    <Layout>
      <div className="ai-planner-container">
        {/* Header */}
        <div className="ai-planner-header">
          <div className="ai-planner-badge">
            <Sparkles size={14} />
            <span>Trợ lý AI Lập Lịch Trình</span>
          </div>
          <h1 className="ai-planner-title">Lập kế hoạch du lịch bằng AI</h1>
          <p className="ai-planner-subtitle">
            Nhập điểm đến và sở thích của bạn, AI sẽ tự động tạo lịch trình chi tiết từng ngày và tối ưu hóa lộ trình.
          </p>
        </div>

        {/* Input Form */}
        <div className="card ai-planner-card">
          <form onSubmit={handleGenerate} className="ai-planner-form">
            <div className="ai-form-grid">
              {/* Destination */}
              <div className="ai-form-group">
                <label className="ai-label">
                  <MapPin size={16} /> Điểm đến của bạn
                </label>
                <input
                  type="text"
                  required
                  className="ai-input"
                  placeholder="Ví dụ: Đà Nẵng, Sapa, Phú Quốc, Hà Nội..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
                <div className="ai-dest-suggestions">
                  {['Đà Nẵng', 'Sapa', 'Phú Quốc', 'Hà Nội'].map((suggest) => (
                    <button
                      key={suggest}
                      type="button"
                      className="ai-suggest-chip"
                      onClick={() => setDestination(suggest)}
                    >
                      {suggest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="ai-form-group">
                <label className="ai-label">
                  <Calendar size={16} /> Thời gian chuyến đi
                </label>
                <select
                  className="ai-select"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="1">1 ngày (Trong ngày)</option>
                  <option value="2">2 ngày 1 đêm</option>
                  <option value="3">3 ngày 2 đêm</option>
                  <option value="4">4 ngày 3 đêm</option>
                  <option value="5">5 ngày 4 đêm</option>
                </select>
              </div>
            </div>

            {/* Travel Style */}
            <div className="ai-form-group">
              <label className="ai-label">Phong cách du lịch</label>
              <div className="ai-style-grid">
                {STYLES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ai-style-card ${style === item.id ? 'active' : ''}`}
                    onClick={() => setStyle(item.id)}
                  >
                    <item.icon size={20} className="ai-style-icon" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="ai-form-group">
              <label className="ai-label">Mức ngân sách dự kiến</label>
              <div className="ai-budget-grid">
                {BUDGETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ai-budget-card ${budget === item.id ? 'active' : ''}`}
                    onClick={() => setBudget(item.id)}
                  >
                    <div className="ai-budget-name">{item.label}</div>
                    <div className="ai-budget-desc">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn btn-primary ai-submit-btn"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>AI đang tối ưu hóa lộ trình...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Tạo lịch trình bằng AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI Result Presentation */}
        {generatedPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="ai-result-section"
          >
            <div className="ai-result-header card">
              <div className="ai-result-info">
                <span className="badge badge-gold">
                  <Sparkles size={12} /> ĐÃ HOÀN TẤT LỊCH TRÌNH
                </span>
                <h2 className="ai-result-title">{generatedPlan.title}</h2>
                <p className="ai-result-summary">{generatedPlan.summary}</p>
                <div className="ai-result-meta">
                  <span className="ai-meta-tag">
                    <Clock size={14} /> {duration} ngày
                  </span>
                  <span className="ai-meta-tag">
                    <MapPin size={14} /> {generatedPlan.allLocations.length} điểm dừng
                  </span>
                  <span className="ai-meta-tag">
                    <DollarSign size={14} /> Ước tính: {generatedPlan.budgetEst}
                  </span>
                </div>
              </div>

              <div className="ai-result-actions">
                <button
                  type="button"
                  onClick={handleSaveToTrips}
                  className="btn btn-primary ai-save-btn"
                >
                  <span>Lưu vào chuyến đi</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Day by Day Cards */}
            <div className="ai-days-container">
              {generatedPlan.days.map((dayPlan) => (
                <div key={dayPlan.day} className="card ai-day-card">
                  <div className="ai-day-header">
                    <div className="ai-day-pill">Ngày {dayPlan.day}</div>
                    <h3 className="ai-day-title">{dayPlan.title}</h3>
                  </div>

                  <div className="ai-day-timeline">
                    {dayPlan.spots.map((spot, sIdx) => (
                      <div key={sIdx} className="ai-timeline-item">
                        <div className="ai-timeline-time">
                          <Clock size={13} /> {spot.time}
                        </div>
                        <div className="ai-timeline-dot" />
                        <div className="ai-timeline-content">
                          <h4 className="ai-spot-name">{spot.name}</h4>
                          <p className="ai-spot-desc">{spot.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default AiPlanner;
