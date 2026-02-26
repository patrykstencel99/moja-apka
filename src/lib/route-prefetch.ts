'use client';

import { fetchJsonCached } from '@/lib/client-fetch-cache';

type PrefetchableRoute = '/today' | '/systems' | '/review' | '/competition' | '/journal' | '/experiments' | '/settings';

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function isoWeekString(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + shift);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function prefetchRouteData(route: PrefetchableRoute) {
  if (route === '/today') {
    const localDate = todayLocalDate();
    const currentYear = Number(localDate.slice(0, 4));
    await Promise.allSettled([
      fetchJsonCached('/api/user/profile', { ttlMs: 20_000 }),
      fetchJsonCached('/api/setup/activities', { ttlMs: 20_000 }),
      fetchJsonCached(`/api/checkins?from=${localDate}&to=${localDate}&compact=1`, { ttlMs: 12_000 }),
      fetchJsonCached(`/api/checkins?from=${currentYear}-01-01&to=${currentYear}-12-31&compact=1`, { ttlMs: 45_000 }),
      fetchJsonCached('/api/gamification/status', { ttlMs: 12_000 }),
      fetchJsonCached(`/api/fun/today?date=${localDate}`, { ttlMs: 10_000 })
    ]);
    return;
  }

  if (route === '/systems') {
    await Promise.allSettled([
      fetchJsonCached('/api/setup/starter-packs', { ttlMs: 60_000 }),
      fetchJsonCached('/api/setup/activities', { ttlMs: 20_000 })
    ]);
    return;
  }

  if (route === '/review') {
    const now = new Date();
    const week = isoWeekString(now);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const weekStart = startOfWeekMonday(now);
    const weekEnd = addDays(weekStart, 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    await Promise.allSettled([
      fetchJsonCached(`/api/reports/weekly?week=${week}`, { ttlMs: 20_000 }),
      fetchJsonCached(`/api/reports/monthly?month=${month}`, { ttlMs: 25_000 }),
      fetchJsonCached(`/api/checkins?from=${toDateOnly(weekStart)}&to=${toDateOnly(weekEnd)}&compact=1`, { ttlMs: 20_000 }),
      fetchJsonCached(`/api/checkins?from=${toDateOnly(monthStart)}&to=${toDateOnly(monthEnd)}`, { ttlMs: 20_000 }),
      fetchJsonCached(`/api/checkins?from=${toDateOnly(yearStart)}&to=${toDateOnly(yearEnd)}&compact=1`, { ttlMs: 45_000 }),
      fetchJsonCached(`/api/fun/stamps?from=${toDateOnly(yearStart)}&to=${toDateOnly(yearEnd)}`, { ttlMs: 45_000 }),
      fetchJsonCached('/api/fun/duels?limit=400', { ttlMs: 20_000 })
    ]);
  }
}
