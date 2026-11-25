const DAY_COLORS = [
  ['#236447', '#eaf5ee'],
  ['#245b91', '#edf4fc'],
  ['#754398', '#f5eef9'],
  ['#90501f', '#fcf2e8'],
  ['#963f64', '#fbeef3'],
  ['#176773', '#e9f6f7'],
];

export function itineraryDayStyle(day) {
  // shortcut: colors repeat after six days; keep day labels visible for longer trips.
  const index = Number.isSafeInteger(day) && day > 0 ? day - 1 : 0;
  const [color, background] = DAY_COLORS[index % DAY_COLORS.length];
  return { '--day-color': color, '--day-background': background };
}
