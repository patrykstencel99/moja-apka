'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { readExperiments } from '@/lib/state/local-storage';

type Insight = {
  factor: string;
  direction: 'positive' | 'negative';
  confidence: number;
  lag: 0 | 1;
  explanation: string;
};

type ReportResponse = {
  insufficientData: boolean;
  message: string;
  uniqueDays: number;
  positive: Insight[];
  negative: Insight[];
};

type CheckInValue = {
  booleanValue: boolean | null;
  numericValue: number | null;
  activity: {
    id: string;
    name: string;
    valenceHint?: 'positive' | 'negative' | 'neutral';
  };
};

type CheckIn = {
  id: string;
  localDate: string;
  mood: number;
  energy: number;
  journal: string | null;
  createdAt: string;
  values: CheckInValue[];
};

type Period = 'week' | 'month' | 'year';
type MonthGridCell =
  | { empty: true }
  | {
      empty: false;
      day: number;
      localDate: string;
      state: 'none' | 'stable' | 'unstable' | 'mid';
    };

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

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function dayAverages(checkins: CheckIn[]) {
  const map = new Map<string, { mood: number[]; energy: number[] }>();
  for (const checkin of checkins) {
    const day = map.get(checkin.localDate) ?? { mood: [], energy: [] };
    day.mood.push(checkin.mood);
    day.energy.push(checkin.energy);
    map.set(checkin.localDate, day);
  }

  return new Map(
    Array.from(map.entries()).map(([localDate, data]) => [
      localDate,
      {
        mood: Number(mean(data.mood).toFixed(1)),
        energy: Number(mean(data.energy).toFixed(1))
      }
    ])
  );
}

function topFactor(report: ReportResponse | null, direction: 'positive' | 'negative') {
  if (!report || report.insufficientData) {
    return null;
  }
  const list = direction === 'positive' ? report.positive : report.negative;
  return list[0] ?? null;
}

function nextTestLine(report: ReportResponse | null) {
  const gain = topFactor(report, 'positive');
  const risk = topFactor(report, 'negative');

  if (!gain && !risk) {
    return 'Eksperyment tygodnia: zrob jeden check-in dziennie i testuj jedna mala korekte poranka.';
  }
  if (gain && risk) {
    return `Jutro ogranicz "${risk.factor}" i powtorz "${gain.factor}" w wersji minimalnej.`;
  }
  if (risk) {
    return `Jutro postaw jedna bariere na "${risk.factor}".`;
  }
  return `Jutro utrwal "${gain?.factor}" jako staly krok poranny.`;
}

function mostFrequentTrigger(checkins: CheckIn[]) {
  const counters = new Map<string, number>();
  for (const checkin of checkins) {
    for (const value of checkin.values) {
      if (value.activity.valenceHint !== 'negative' || !value.booleanValue) {
        continue;
      }
      counters.set(value.activity.name, (counters.get(value.activity.name) ?? 0) + 1);
    }
  }

  const sorted = Array.from(counters.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return 'Brak dominujacego triggera. Zbieraj dalej dane binarne.';
  }
  return sorted[0][0];
}

function heatClass(value: number) {
  if (value >= 7) {
    return 'heat-up';
  }
  if (value <= 4) {
    return 'heat-down';
  }
  return 'heat-neutral';
}

function buildTrendPath(values: number[]) {
  if (values.length === 0) {
    return { path: '', points: [] as Array<{ x: number; y: number; value: number }> };
  }

  const width = 700;
  const height = 180;
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((value, index) => ({
    x: Number((index * stepX).toFixed(2)),
    y: Number((height - (Math.max(0, Math.min(10, value)) / 10) * (height - 24) - 12).toFixed(2)),
    value
  }));

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return { path, points };
}

function monthName(month: number) {
  return new Date(2026, month, 1).toLocaleDateString('pl-PL', { month: 'long' });
}

function buildYearStats(checkins: CheckIn[], experimentsCount: number) {
  const byMonth = new Map<number, number[]>();
  for (let month = 0; month < 12; month++) {
    byMonth.set(month, []);
  }

  for (const checkin of checkins) {
    const month = new Date(`${checkin.localDate}T00:00:00`).getMonth();
    byMonth.get(month)?.push(checkin.energy);
  }

  const daily = dayAverages(checkins);
  const sortedDays = Array.from(daily.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let recoveries = 0;
  for (let index = 1; index < sortedDays.length; index++) {
    const previousEnergy = sortedDays[index - 1][1].energy;
    const currentEnergy = sortedDays[index][1].energy;
    if (previousEnergy <= 4 && currentEnergy >= 6) {
      recoveries += 1;
    }
  }

  return {
    months: Array.from({ length: 12 }).map((_, month) => {
      const energies = byMonth.get(month) ?? [];
      const stability = Math.max(0, Math.min(100, Math.round(100 - std(energies) * 22)));
      return {
        month,
        stability
      };
    }),
    recoveries,
    experimentsCount
  };
}

export function ReviewClient() {
  const [period, setPeriod] = useState<Period>('week');
  const [weeklyReport, setWeeklyReport] = useState<ReportResponse | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<ReportResponse | null>(null);
  const [weekCheckins, setWeekCheckins] = useState<CheckIn[]>([]);
  const [monthCheckins, setMonthCheckins] = useState<CheckIn[]>([]);
  const [yearCheckins, setYearCheckins] = useState<CheckIn[]>([]);
  const [experimentsCount, setExperimentsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExperimentsCount(readExperiments().length);
  }, []);

  useEffect(() => {
    const now = new Date();
    const week = isoWeekString(now);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const weekStart = startOfWeekMonday(now);
    const weekEnd = addDays(weekStart, 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const load = async () => {
      setError(null);
      const [weeklyRes, monthlyRes, weekRes, monthRes, yearRes] = await Promise.all([
        fetch(`/api/reports/weekly?week=${week}`),
        fetch(`/api/reports/monthly?month=${month}`),
        fetch(`/api/checkins?from=${toDateOnly(weekStart)}&to=${toDateOnly(weekEnd)}`),
        fetch(`/api/checkins?from=${toDateOnly(monthStart)}&to=${toDateOnly(monthEnd)}`),
        fetch(`/api/checkins?from=${toDateOnly(yearStart)}&to=${toDateOnly(yearEnd)}`)
      ]);

      if (!weeklyRes.ok || !monthlyRes.ok || !weekRes.ok || !monthRes.ok || !yearRes.ok) {
        setError(uiCopy.review.loadError);
        return;
      }

      setWeeklyReport((await weeklyRes.json()) as ReportResponse);
      setMonthlyReport((await monthlyRes.json()) as ReportResponse);
      setWeekCheckins(((await weekRes.json()) as { checkIns: CheckIn[] }).checkIns);
      setMonthCheckins(((await monthRes.json()) as { checkIns: CheckIn[] }).checkIns);
      setYearCheckins(((await yearRes.json()) as { checkIns: CheckIn[] }).checkIns);
    };

    void load();
  }, []);

  const weeklyGain = useMemo(() => topFactor(weeklyReport, 'positive'), [weeklyReport]);
  const weeklyRisk = useMemo(() => topFactor(weeklyReport, 'negative'), [weeklyReport]);
  const weeklyAction = useMemo(() => nextTestLine(weeklyReport), [weeklyReport]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const start = startOfWeekMonday(now);
    return Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(start, index);
      return {
        key: toDateOnly(day),
        label: day.toLocaleDateString('pl-PL', { weekday: 'short' })
      };
    });
  }, []);

  const weekAvg = useMemo(() => dayAverages(weekCheckins), [weekCheckins]);
  const weekTrend = useMemo(() => {
    const values = weekDays.map((day) => weekAvg.get(day.key)?.energy ?? 0);
    return buildTrendPath(values);
  }, [weekAvg, weekDays]);

  const monthGrid = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const leading = firstDay === 0 ? 6 : firstDay - 1;
    const averages = dayAverages(monthCheckins);
    const trigger = mostFrequentTrigger(monthCheckins);

    const cells: MonthGridCell[] = Array.from({ length: leading }).map(() => ({ empty: true }));
    for (let day = 1; day <= daysInMonth; day++) {
      const localDate = toDateOnly(new Date(now.getFullYear(), now.getMonth(), day));
      const value = averages.get(localDate);
      const state = !value ? 'none' : value.energy >= 7 ? 'stable' : value.energy <= 4 ? 'unstable' : 'mid';
      cells.push({
        empty: false as const,
        day,
        localDate,
        state
      });
    }

    return {
      cells,
      trigger
    };
  }, [monthCheckins]);

  const yearStats = useMemo(
    () => buildYearStats(yearCheckins, experimentsCount),
    [yearCheckins, experimentsCount]
  );

  return (
    <div className="stack-lg">
      {error && (
        <Banner tone="danger" title={uiCopy.review.errorTitle}>
          {error}
        </Banner>
      )}

      <Card
        tone="strong"
        title={uiCopy.review.cockpitTitle}
        subtitle={uiCopy.review.cockpitSubtitle}
        actions={
          <div className="mode-switch">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')} type="button">
              {uiCopy.review.periodWeek}
            </button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')} type="button">
              {uiCopy.review.periodMonth}
            </button>
            <button className={period === 'year' ? 'active' : ''} onClick={() => setPeriod('year')} type="button">
              {uiCopy.review.periodYear}
            </button>
          </div>
        }
      >
        {weeklyReport?.insufficientData ? (
          <Banner tone="info" title={uiCopy.review.lowDataTitle}>
            {uiCopy.review.lowDataBody}
          </Banner>
        ) : (
          <div className="grid grid-2">
            <Card title={uiCopy.review.topGainTitle} subtitle={uiCopy.review.topGainSubtitle}>
              <p>{weeklyGain ? weeklyGain.factor : uiCopy.review.noTopGain}</p>
              <small>{weeklyGain ? `Lag ${weeklyGain.lag} • pewnosc ${weeklyGain.confidence}%` : uiCopy.review.noCausalityHint}</small>
            </Card>
            <Card title={uiCopy.review.topRiskTitle} subtitle={uiCopy.review.topRiskSubtitle}>
              <p>{weeklyRisk ? weeklyRisk.factor : uiCopy.review.noTopRisk}</p>
              <small>{weeklyRisk ? `Lag ${weeklyRisk.lag} • pewnosc ${weeklyRisk.confidence}%` : uiCopy.review.monitorCoreHint}</small>
            </Card>
          </div>
        )}

        <Banner tone="warning" title={uiCopy.review.nextTestTitle}>
          {weeklyAction}
        </Banner>
      </Card>

      {period === 'week' && (
        <Card tone="elevated" title={uiCopy.review.weekCardTitle} subtitle={uiCopy.review.weekCardSubtitle}>
          <div className="review-trend">
            <svg aria-label="Trend energii" viewBox="0 0 700 180">
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f6b43" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#1f6b43" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={weekTrend.path} fill="none" stroke="#1f6b43" strokeWidth="3" />
              {weekTrend.points.map((point, index) => (
                <circle cx={point.x} cy={point.y} key={`${point.x}-${index}`} r="4.8">
                  <title>{`Energia: ${point.value}`}</title>
                </circle>
              ))}
            </svg>
          </div>

          <div className="week-heatmap">
            {weekDays.map((day) => {
              const avg = weekAvg.get(day.key);
              return (
                <article className="week-cell" key={day.key}>
                  <strong>{day.label}</strong>
                  <div className={`heat-chip ${avg ? heatClass(avg.mood) : 'heat-empty'}`}>
                    {uiCopy.review.moodLabel} {avg ? avg.mood : '-'}
                  </div>
                  <div className={`heat-chip ${avg ? heatClass(avg.energy) : 'heat-empty'}`}>
                    {uiCopy.review.energyLabel} {avg ? avg.energy : '-'}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="grid grid-2">
            <Card title={uiCopy.review.topOneGain}>
              <p>{weeklyGain?.factor ?? uiCopy.review.noGainWeek}</p>
            </Card>
            <Card title={uiCopy.review.topOneRisk}>
              <p>{weeklyRisk?.factor ?? uiCopy.review.noRiskWeek}</p>
            </Card>
          </div>

          <div className="panel-subtle">
            <strong>{uiCopy.review.weekExperimentTitle}</strong>
            <small>{weeklyAction}</small>
            <Link className="review-link" href="/experiments">
              {uiCopy.review.weekExperimentLink}
            </Link>
          </div>
        </Card>
      )}

      {period === 'month' && (
        <Card tone="elevated" title={uiCopy.review.monthCardTitle} subtitle={uiCopy.review.monthCardSubtitle}>
          <div className="month-grid">
            {monthGrid.cells.map((cell, index) =>
              cell.empty ? (
                <div className="month-cell month-cell--empty" key={`empty-${index}`} />
              ) : (
                <div className={`month-cell month-cell--${cell.state}`} key={cell.localDate}>
                  <span>{cell.day}</span>
                </div>
              )
            )}
          </div>
          <small>
            {uiCopy.review.monthTriggerLabel} <strong>{topFactor(monthlyReport, 'negative')?.factor ?? monthGrid.trigger}</strong>
          </small>
          <Link className="review-link" href="/experiments">
            {uiCopy.review.monthLink}
          </Link>
        </Card>
      )}

      {period === 'year' && (
        <Card tone="elevated" title={uiCopy.review.yearCardTitle} subtitle={uiCopy.review.yearCardSubtitle}>
          <div className="year-grid">
            {yearStats.months.map((month) => (
              <article className="year-cell" key={month.month}>
                <small>{monthName(month.month)}</small>
                <strong>ESI {month.stability}</strong>
              </article>
            ))}
          </div>

          <div className="panel-subtle">
            <strong>{uiCopy.review.yearSummaryTitle}</strong>
            <small>
              {uiCopy.review.yearExperimentsLabel} {yearStats.experimentsCount}
            </small>
            <small>
              {uiCopy.review.yearRecoveriesLabel} {yearStats.recoveries}
            </small>
            <Link className="review-link" href="/today">
              {uiCopy.review.backToToday}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
