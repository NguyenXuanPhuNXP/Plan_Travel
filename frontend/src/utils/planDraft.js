export const toLocalDateTime = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = value => value ? new Date(value).toISOString() : null;
export const createPlanDraft = trip => ({
  name: trip.name || trip.title || '', destination: trip.destination || '',
  startLocation: trip.startLocation || '', endLocation: trip.endLocation || '',
  startDate: toLocalDateTime(trip.startDate), endDate: toLocalDateTime(trip.endDate),
  totalDays: trip.totalDays || 1, travelerCount: trip.travelerCount || 1,
  transportMode: trip.transportMode || '', description: trip.description || '',
  status: ['draft', 'generated', 'completed', 'cancelled'].includes(trip.status) ? trip.status : 'draft',
  visibility: trip.visibility || 'private', budget: trip.budget ?? 0,
  costScope: trip.costScope || 'PERSON',
  ...Object.fromEntries(['Transport', 'Meals', 'Attractions', 'Accommodation', 'Contingency'].map(key => [`cost${key}`, trip[`cost${key}`] ?? 0])),
  preferences: Array.isArray(trip.preferences) ? trip.preferences.join(', ') : '',
  items: (trip.items || []).map(item => ({
    ...item, key: String(item.id), customName: item.customName || '',
    displayName: item.location?.name || item.customName || 'Điểm dừng',
    day: Number(String(item.note || '').match(/\[DAY:(\d+)\]/)?.[1] || 1),
    note: String(item.note || '').replace(/\[DAY:\d+\]\s*/g, ''),
    startTime: toLocalDateTime(item.startTime), endTime: toLocalDateTime(item.endTime),
    durationMinutes: item.durationMinutes ?? '', travelMinutes: item.travelMinutes ?? '', travelDistanceKm: item.travelDistanceKm ?? ''
  })),
  packingItems: (trip.packingItems || []).map(item => ({ ...item, key: String(item.id), notes: item.notes || '' })),
  collaborators: (trip.collaborators || []).map(member => ({ userId: member.userId, name: member.user?.name || member.user?.fullName, email: member.user?.email, permission: member.permission }))
});

export const planPayload = (draft, trip, isOwner) => ({
  ...draft,
  startDate: fromLocal(draft.startDate), endDate: fromLocal(draft.endDate),
  startCalendarDate: draft.startDate ? draft.startDate.slice(0, 10) : null,
  endCalendarDate: draft.endDate ? draft.endDate.slice(0, 10) : null,
  expectedUpdatedAt: trip.updatedAt,
  preferences: draft.preferences.split(',').map(value => value.trim()).filter(Boolean),
  items: draft.items.map(item => ({ ...item, startTime: fromLocal(item.startTime), endTime: fromLocal(item.endTime) })),
  ...(isOwner ? { collaborators: draft.collaborators, visibility: draft.visibility } : { collaborators: undefined, visibility: undefined })
});
