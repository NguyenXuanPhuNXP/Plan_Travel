export const COST_LABELS = { transport: 'Di chuyển', accommodation: 'Lưu trú', meals: 'Ăn uống', attractions: 'Tham quan, hoạt động', contingency: 'Dự phòng' };

export function aiPlanCosts(plan) {
  if (!plan?.costAllocation) return {};
  const costs = Object.fromEntries(Object.keys(COST_LABELS).map(key => [key, plan.costAllocation[key] == null ? null : Math.max(0, Math.round(Number(plan.costAllocation[key]) || 0))]));
  const unknown = Object.values(costs).some(value => value == null);
  return { costTransport: costs.transport, costAccommodation: costs.accommodation, costMeals: costs.meals, costAttractions: costs.attractions, costContingency: costs.contingency, totalCost: unknown ? null : Object.values(costs).reduce((a, b) => a + b, 0) };
}

export function aiPlanDescription(plan) {
  return [plan?.description, plan?.transport && `Phương tiện: ${plan.transport}`, plan?.accommodation && `Lưu trú: ${plan.accommodation}`,
    plan?.costAllocation && `Chi phí ước tính cho cả nhóm (VNĐ): ${Object.entries(COST_LABELS).map(([key, label]) => `${label}: ${plan.costAllocation[key] == null ? 'chưa có dữ liệu' : Number(plan.costAllocation[key]).toLocaleString('vi-VN')}`).join('; ')}`,
    plan?.costBreakdown?.length && `Chi tiết cách tính chi phí: ${plan.costBreakdown.map(line => `${line.description}: ${line.totalCost == null ? 'chưa xác định' : Number(line.totalCost).toLocaleString('vi-VN') + ' VNĐ'}`).join('; ')}`,
    plan?.weather && `Thời tiết: ${plan.weather}`,
    plan?.risks?.length && `Rủi ro và cách xử lý:\n${plan.risks.join('\n')}`].filter(Boolean).join('\n\n');
}
