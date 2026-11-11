export function completeItineraryDays(groups, totalDays = 1) {
  const days = new Map(groups.map(group => [group.day, group]));
  for (let day = 1; day <= Math.min(365, Math.max(1, Number(totalDays) || 1)); day++) {
    if (!days.has(day)) days.set(day, { day, items: [] });
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}
