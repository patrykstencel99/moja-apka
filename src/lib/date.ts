import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

export function formatLocalDate(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(date);
}

export function parseLocalDate(localDate: string): Date {
  return parseISO(`${localDate}T00:00:00.000Z`);
}

export function dayDiff(fromLocalDate: string, toLocalDate: string): number {
  return differenceInCalendarDays(parseLocalDate(toLocalDate), parseLocalDate(fromLocalDate));
}

export function plusDays(localDate: string, days: number): string {
  return format(addDays(parseLocalDate(localDate), days), 'yyyy-MM-dd');
}

export function toIsoWeekInfo(date: Date): { week: number; year: number } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / 604800000);
  return { week, year: target.getUTCFullYear() };
}

export function weekStartFromIso(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const monday = new Date(simple);
  if (dow <= 4) {
    monday.setUTCDate(simple.getUTCDate() - ((dow + 6) % 7));
  } else {
    monday.setUTCDate(simple.getUTCDate() + (8 - dow));
  }
  return monday;
}
