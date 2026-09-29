export function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function countBusinessDays(start: Date, end: Date) {
  let n = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

export function splitOvertimeHours(weeklyHoursBefore: number, newHours: number) {
  let double = 0;
  let triple = 0;
  for (let i = 0; i < newHours; i++) {
    const slot = weeklyHoursBefore + i + 1;
    if (slot <= 9) double++;
    else triple++;
  }
  return { hoursDouble: double, hoursTriple: triple };
}

export function vacationPremiumMxn(stampedMxn: number, cashMxn: number, businessDays: number) {
  const daily = (stampedMxn + cashMxn) / 30;
  return Math.round(daily * businessDays * 0.25);
}
