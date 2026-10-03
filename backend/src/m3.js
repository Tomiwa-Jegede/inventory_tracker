// M3: calendar-aware daily set-aside. All money integers.

export function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

export function cycleDays(overhead, refDateStr) {
  if (overhead.frequency === 'daily') return 1;
  if (overhead.frequency === 'weekly') return 7;
  if (overhead.frequency === 'custom') return overhead.custom_days || 1;
  const [y, m] = refDateStr.split('-').map(Number);
  return daysInMonth(y, m);
}

export function ruleForDate(overhead, dateStr) {
  const hist = [...(overhead.history || [])].sort((a, b) => (a.from_date < b.from_date ? -1 : 1));
  if (!hist.length) return overhead;
  let active = hist[0];
  for (const h of hist) {
    if (h.from_date <= dateStr) active = h;
    else break;
  }
  return { ...overhead, ...active };
}

export function dailySetAside(overhead, dateStr) {
  if (overhead.is_active === false) return 0;
  const rule = ruleForDate(overhead, dateStr);
  const days = cycleDays(rule, dateStr);
  return Math.round(rule.amount_minor / days);
}
