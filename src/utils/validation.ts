export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidTimeRange(value: string) {
  const time = String.raw`(?:[01]\d|2[0-3]):[0-5]\d`;
  const match = value.trim().match(new RegExp(`^${time}(?:\\s*-\\s*(${time}))?$`));
  if (!match) return false;
  if (!match[1]) return true;
  const [startHour, startMinute] = value.trim().split('-')[0].split(':').map(Number);
  const [endHour, endMinute] = match[1].split(':').map(Number);
  return endHour * 60 + endMinute >= startHour * 60 + startMinute;
}

export function parseRupiahAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(normalized)) return null;
  const amount = Number(normalized.replace(/[.,]/g, ''));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
