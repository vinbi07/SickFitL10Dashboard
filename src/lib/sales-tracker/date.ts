export const SALES_TRACKER_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function getMonday(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addDays(date: Date, count: number) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + count);
  return copy;
}

export function formatYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getWeekKey(date: Date) {
  return formatYmd(getMonday(date));
}

export function getWeekRangeLabel(weekStartDate: string) {
  const start = parseYmd(weekStartDate);
  const end = addDays(start, 6);

  if (start.getMonth() === end.getMonth()) {
    return `Week of ${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
  }

  return `Week of ${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

export function getEntryDate(weekStartDate: string, dayIndex: number) {
  return formatYmd(addDays(parseYmd(weekStartDate), dayIndex));
}

export function getTodayKey() {
  return formatYmd(new Date());
}

export function formatShortDate(dateKey: string) {
  const date = parseYmd(dateKey);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
