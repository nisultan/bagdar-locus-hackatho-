const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const usd = (n: number) => (n === 0 ? '$0' : '$' + Math.round(n).toLocaleString('en-US'));

export const monthYear = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const isoMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;

export const monthsBetween = (fromIso: string, toIso: string) => {
  const [y1, m1] = fromIso.split('-').map(Number);
  const [y2, m2] = toIso.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
