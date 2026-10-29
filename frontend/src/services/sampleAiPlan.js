// Temporary local data source. Replace this adapter with the AI API later.
export function createSampleAiPlan({ destination, days = 3, budget = null, travelerCount = 2, transportMode = 'flight', locations = [] }) {
  const totalDays = Math.max(1, Math.min(30, Math.floor(Number(days) || 3)));
  const people = Math.max(1, Number(travelerCount) || 1);
  const total = budget == null || budget === '' ? people * totalDays * 1000000 : Math.max(0, Math.round(Number(budget) || 0));
  const costAllocation = {
    transport: Math.floor(total * .25), accommodation: Math.floor(total * .3),
    meals: Math.floor(total * .2), attractions: Math.floor(total * .15),
  };
  if (totalDays === 1) {
    costAllocation.attractions += costAllocation.accommodation;
    costAllocation.accommodation = 0;
  }
  costAllocation.contingency = total - Object.values(costAllocation).reduce((sum, cost) => sum + cost, 0);
  const modes = { flight: 'Máy bay', coach: 'Xe khách', train: 'Tàu hỏa', motorbike: 'Xe máy', car: 'Ô tô tự lái', other: 'Xe khách hoặc tàu hỏa' };
  const stops = locations.length ? locations : [
    { id: 'sample-culture', name: `Khu văn hóa tại ${destination} (mẫu)`, category: 'tourism', address: 'Địa chỉ minh họa, chọn địa điểm thực trước khi đi', estimatedCost: 100000 },
    { id: 'sample-nature', name: `Công viên tại ${destination} (mẫu)`, category: 'natural', address: 'Địa chỉ minh họa, chọn địa điểm thực trước khi đi', estimatedCost: 50000 },
    { id: 'sample-market', name: `Chợ địa phương tại ${destination} (mẫu)`, category: 'shopping', address: 'Địa chỉ minh họa, chọn địa điểm thực trước khi đi', estimatedCost: 0 },
  ];
  const activity = (name, startTime, endTime, note, location = null) => ({
    locationName: name, locationId: location?.id || null, location,
    startTime, endTime, note, travelMinutesToNext: 20,
  });
  return {
    generationMethod: 'sample',
    planName: `Khám phá ${destination} · ${totalDays} ngày (mẫu)`,
    description: `DỮ LIỆU MẪU để kiểm tra giao diện, chưa gọi API AI. Chuyến đi ${totalDays} ngày cho ${people} người tại ${destination}. Địa điểm, dịch vụ, giá và thời tiết dưới đây chỉ minh họa, chưa được xác minh.`,
    transport: `${modes[transportMode] || modes.other} để đến ${destination}; đi taxi/xe công nghệ giữa các điểm cách xa và đi bộ trong khu trung tâm. Dành 20–30 phút giữa các điểm. Tuyến đi sẽ được điều chỉnh khi có điểm xuất phát thực tế.`,
    accommodation: totalDays > 1
      ? `Khách sạn 3 sao gần trung tâm ${destination}, ${Math.ceil(people / 2)} phòng đôi, ${totalDays - 1} đêm. Nhận phòng khoảng 14:00, trả phòng trước 12:00 ngày cuối. Ưu tiên nơi có hủy miễn phí. Đây là đề xuất minh họa, chưa có cơ sở lưu trú được đặt.`
      : 'Đi trong ngày, không đặt phòng qua đêm. Có thể nghỉ trưa tại quán cà phê gần khu tham quan (minh họa).',
    costAllocation,
    weather: 'Thời tiết MẪU: sáng nắng nhẹ 25–29°C, chiều có thể mưa rào. Tham quan ngoài trời vào buổi sáng, chuyển sang bảo tàng hoặc quán cà phê khi mưa. Đây không phải dự báo thực tế.',
    risks: [
      'Mưa làm gián đoạn hoạt động ngoài trời: chuyển sang điểm tham quan trong nhà và mang áo mưa.',
      'Kẹt xe hoặc trễ chuyến: dự phòng 30–60 phút, xác nhận giờ khởi hành trước một ngày.',
      'Giá dịch vụ thay đổi hoặc hết phòng: kiểm tra giá thực, chọn đặt chỗ có chính sách hủy rõ ràng.',
      `Giữ ${costAllocation.contingency.toLocaleString('vi-VN')} VNĐ dự phòng cho cả nhóm, không dùng hết vào mua sắm.`,
    ],
    days: Array.from({ length: totalDays }, (_, index) => {
      const first = stops[(index * 2) % stops.length];
      const second = stops[(index * 2 + 1) % stops.length];
      const dailyShare = (amount) => Math.floor(amount / totalDays) + (index < amount % totalDays ? 1 : 0);
      const mealBudget = dailyShare(costAllocation.meals);
      const visitBudget = dailyShare(costAllocation.attractions);
      const items = [
        activity('Ăn sáng món địa phương', '07:00', '08:00', 'Chọn quán gần nơi lưu trú; kiểm tra vệ sinh và thực đơn.'),
        activity(first.name, '08:30', '11:00', 'Tham quan, chụp ảnh và tìm hiểu văn hóa địa phương. Giá vé chỉ minh họa.', first),
        activity('Ăn trưa và nghỉ ngơi', '11:30', '13:00', 'Ưu tiên món địa phương, hỏi giá trước khi gọi món.'),
        activity(second.name, '14:00', '16:30', 'Di chuyển bằng taxi hoặc xe công nghệ; đổi sang hoạt động trong nhà nếu trời mưa.', second),
        activity('Ăn tối và dạo phố', '18:00', '20:00', 'Thưởng thức ẩm thực địa phương, đi bộ tại khu trung tâm.'),
        activity(index === totalDays - 1 ? 'Kết thúc lịch trình, chuẩn bị trở về' : 'Về nơi lưu trú nghỉ ngơi', '20:30', '21:30', 'Kiểm tra đồ cá nhân và xác nhận phương tiện cho chặng tiếp theo.'),
      ];
      const mealCosts = [Math.floor(mealBudget * .25), Math.floor(mealBudget * .35)];
      mealCosts.push(mealBudget - mealCosts[0] - mealCosts[1]);
      const costs = [mealCosts[0], Math.floor(visitBudget / 2), mealCosts[1], visitBudget - Math.floor(visitBudget / 2), mealCosts[2], 0];
      const details = [
        `Ăn sáng gần nơi lưu trú tại ${destination}; chọn món địa phương, gọi món theo khẩu phần cho ${people} người.`,
        `Khám phá ${first.name}: tham quan khu chính, nghe giới thiệu văn hóa địa phương, chụp ảnh và nghỉ giải lao. Kiểm tra giờ mở cửa trước khi đi.`,
        `Dùng bữa tại quán ăn địa phương gần ${first.name}; nghỉ trưa và bổ sung nước trước hoạt động buổi chiều.`,
        `Trải nghiệm ${second.name}: dạo bộ, tìm hiểu đời sống địa phương và chụp ảnh. Khi mưa, thay bằng bảo tàng hoặc quán cà phê trong nhà.`,
        `Ăn tối tại khu trung tâm ${destination}, sau đó dạo phố và thưởng thức món địa phương; thống nhất giờ tập trung của nhóm.`,
        index === totalDays - 1 ? 'Kiểm tra hành lý, giấy tờ và vé; đến bến xe, ga hoặc sân bay theo giờ khởi hành thực tế, dự phòng 60 phút.' : 'Trở lại khách sạn, nghỉ ngơi, sạc thiết bị và xác nhận lịch trình ngày tiếp theo.',
      ];
      items.forEach((item, position) => {
        item.estimatedCost = costs[position];
        item.activityDescription = details[position];
        item.transport = position === 5 ? 'Taxi/xe công nghệ, dự phòng theo giờ khởi hành' : position % 2 ? 'Taxi/xe công nghệ khoảng 20 phút' : 'Đi bộ 10–15 phút nếu ở gần';
        item.note = `${details[position]} Di chuyển: ${item.transport}. Chi phí hoạt động mẫu cho cả nhóm: ${costs[position].toLocaleString('vi-VN')} VNĐ. ${item.note}`;
      });
      return { dayNumber: index + 1, title: index === 0 ? 'Đến nơi và khám phá trung tâm' : index === totalDays - 1 ? 'Khám phá địa phương và trở về' : 'Trải nghiệm văn hóa và thiên nhiên', summary: `Buổi sáng: ${first.name}. Buổi chiều: ${second.name}. Buổi tối: ẩm thực và ${index === totalDays - 1 ? 'chuẩn bị trở về' : 'nghỉ ngơi'}.`, items };
    }),
  };
}
