'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { readExperiments } from '@/lib/state/local-storage';

type Insight = {
  factor: string;
  direction: 'positive' | 'negative';
  confidence: number;
  lag: 0 | 1;
  explanation: string;
};

type DataVolume = 'low' | 'medium' | 'high';

type ReportThresholds = {
  low: {
    minUniqueDays: number;
  };
  high: {
    minUniqueDays: number;
    minCheckins: number;
    minTrackedFactors: number;
  };
};

type MacroPattern = {
  title: string;
  description: string;
  confidence: number;
};

type ReportResponse = {
  insufficientData: boolean;
  message: string;
  uniqueDays: number;
  totalCheckins: number;
  trackedFactors: number;
  dataVolume: DataVolume;
  thresholds: ReportThresholds;
  positive: Insight[];
  negative: Insight[];
  macroPatterns: MacroPattern[];
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

const DEFAULT_THRESHOLDS: ReportThresholds = {
  low: {
    minUniqueDays: 7
  },
  high: {
    minUniqueDays: 21,
    minCheckins: 28,
    minTrackedFactors: 5
  }
};

const TREND_WIDTH = 700;
const TREND_HEIGHT = 180;
const TREND_BASELINE = TREND_HEIGHT - 10;

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

function normalizeInsights(payload: unknown): Insight[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const candidate = item as Partial<Insight>;
      if (
        typeof candidate.factor !== 'string' ||
        (candidate.direction !== 'positive' && candidate.direction !== 'negative')
      ) {
        return null;
      }
      return {
        factor: candidate.factor,
        direction: candidate.direction,
        confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
        lag: candidate.lag === 1 ? 1 : 0,
        explanation: typeof candidate.explanation === 'string' ? candidate.explanation : ''
      };
    })
    .filter((item): item is Insight => item !== null);
}

function normalizeMacroPatterns(payload: unknown): MacroPattern[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const candidate = item as Partial<MacroPattern>;
      if (typeof candidate.title !== 'string' || typeof candidate.description !== 'string') {
        return null;
      }
      return {
        title: candidate.title,
        description: candidate.description,
        confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0
      };
    })
    .filter((item): item is MacroPattern => item !== null);
}

function emptyReport(message: string): ReportResponse {
  return {
    insufficientData: true,
    message,
    uniqueDays: 0,
    totalCheckins: 0,
    trackedFactors: 0,
    dataVolume: 'low',
    thresholds: DEFAULT_THRESHOLDS,
    positive: [],
    negative: [],
    macroPatterns: []
  };
}

function normalizeReport(payload: unknown, fallbackMessage: string): ReportResponse {
  if (!payload || typeof payload !== 'object') {
    return emptyReport(fallbackMessage);
  }

  const candidate = payload as Partial<ReportResponse>;
  const thresholds = candidate.thresholds ?? DEFAULT_THRESHOLDS;

  return {
    insufficientData: Boolean(candidate.insufficientData),
    message: typeof candidate.message === 'string' ? candidate.message : fallbackMessage,
    uniqueDays: typeof candidate.uniqueDays === 'number' ? candidate.uniqueDays : 0,
    totalCheckins: typeof candidate.totalCheckins === 'number' ? candidate.totalCheckins : 0,
    trackedFactors: typeof candidate.trackedFactors === 'number' ? candidate.trackedFactors : 0,
    dataVolume:
      candidate.dataVolume === 'high' || candidate.dataVolume === 'medium' || candidate.dataVolume === 'low'
        ? candidate.dataVolume
        : 'low',
    thresholds: {
      low: {
        minUniqueDays:
          typeof thresholds?.low?.minUniqueDays === 'number'
            ? thresholds.low.minUniqueDays
            : DEFAULT_THRESHOLDS.low.minUniqueDays
      },
      high: {
        minUniqueDays:
          typeof thresholds?.high?.minUniqueDays === 'number'
            ? thresholds.high.minUniqueDays
            : DEFAULT_THRESHOLDS.high.minUniqueDays,
        minCheckins:
          typeof thresholds?.high?.minCheckins === 'number'
            ? thresholds.high.minCheckins
            : DEFAULT_THRESHOLDS.high.minCheckins,
        minTrackedFactors:
          typeof thresholds?.high?.minTrackedFactors === 'number'
            ? thresholds.high.minTrackedFactors
            : DEFAULT_THRESHOLDS.high.minTrackedFactors
      }
    },
    positive: normalizeInsights(candidate.positive),
    negative: normalizeInsights(candidate.negative),
    macroPatterns: normalizeMacroPatterns(candidate.macroPatterns)
  };
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
    return `Next test: jutro ogranicz "${risk.factor}" i powtorz "${gain.factor}" w wersji minimalnej.`;
  }
  if (risk) {
    return `Next test: jutro postaw jedna bariere na "${risk.factor}".`;
  }
  return `Next test: jutro utrwal "${gain?.factor}" jako staly krok poranny.`;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trendY(value: number) {
  return Number((TREND_HEIGHT - (clamp(value, 0, 10) / 10) * (TREND_HEIGHT - 30) - 15).toFixed(2));
}

function buildTrendPath(values: Array<number | null>) {
  if (values.length === 0) {
    return {
      path: '',
      areaPath: '',
      points: [] as Array<{ x: number; y: number | null; value: number | null }>,
      recordedDays: 0
    };
  }

  const stepX = TREND_WIDTH / Math.max(1, values.length - 1);
  const points = values.map((value, index) => ({
    x: Number((index * stepX).toFixed(2)),
    y: value === null ? null : trendY(value),
    value
  }));

  const pathParts: string[] = [];
  const areaParts: string[] = [];
  let segment: Array<{ x: number; y: number }> = [];

  const flush = () => {
    if (segment.length === 0) {
      return;
    }

    const line = segment.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    pathParts.push(line);

    const first = segment[0];
    const last = segment[segment.length - 1];
    const areaLine = segment.map((point) => `L ${point.x} ${point.y}`).join(' ');
    areaParts.push(`M ${first.x} ${TREND_BASELINE} ${areaLine} L ${last.x} ${TREND_BASELINE} Z`);

    segment = [];
  };

  for (const point of points) {
    if (point.value === null || point.y === null) {
      flush();
      continue;
    }
    segment.push({ x: point.x, y: point.y });
  }
  flush();

  return {
    path: pathParts.join(' '),
    areaPath: areaParts.join(' '),
    points,
    recordedDays: points.filter((point) => point.value !== null).length
  };
}

function confidenceLabel(confidence: number) {
  if (confidence >= 75) {
    return 'mocny';
  }
  if (confidence >= 55) {
    return 'sredni';
  }
  return 'wstepny';
}

function dataVolumeLabel(volume: DataVolume) {
  if (volume === 'high') {
    return 'duzo danych';
  }
  if (volume === 'medium') {
    return 'umiarkowana ilosc danych';
  }
  return 'malo danych';
}

function dataSummaryLine(report: ReportResponse | null, windowLabel: string) {
  if (!report) {
    return `Brak danych dla widoku ${windowLabel}.`;
  }

  return `${windowLabel}: ${dataVolumeLabel(report.dataVolume)} (${report.uniqueDays} dni, ${report.totalCheckins} check-inow, ${report.trackedFactors} sygnalow).`;
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

      try {
        const [weeklyRes, monthlyRes, weekRes, monthRes, yearRes] = await Promise.all([
          fetch(`/api/reports/weekly?week=${week}`),
          fetch(`/api/reports/monthly?month=${month}`),
          fetch(`/api/checkins?from=${toDateOnly(weekStart)}&to=${toDateOnly(weekEnd)}`),
          fetch(`/api/checkins?from=${toDateOnly(monthStart)}&to=${toDateOnly(monthEnd)}`),
          fetch(`/api/checkins?from=${toDateOnly(yearStart)}&to=${toDateOnly(yearEnd)}`)
        ]);

        const issues: string[] = [];

        let nextWeekly = emptyReport('Raport tygodniowy chwilowo niedostepny.');
        if (weeklyRes.ok) {
          nextWeekly = normalizeReport(await weeklyRes.json(), 'Brak raportu tygodniowego.');
        } else {
          issues.push('raport tygodniowy');
        }

        let nextMonthly = emptyReport('Raport miesieczny chwilowo niedostepny.');
        if (monthlyRes.ok) {
          nextMonthly = normalizeReport(await monthlyRes.json(), 'Brak raportu miesiecznego.');
        } else {
          issues.push('raport miesieczny');
        }

        let nextWeekCheckins: CheckIn[] = [];
        if (weekRes.ok) {
          const payload = (await weekRes.json()) as { checkIns?: CheckIn[] };
          nextWeekCheckins = Array.isArray(payload.checkIns) ? payload.checkIns : [];
        } else {
          issues.push('check-iny tygodnia');
        }

        let nextMonthCheckins: CheckIn[] = [];
        if (monthRes.ok) {
          const payload = (await monthRes.json()) as { checkIns?: CheckIn[] };
          nextMonthCheckins = Array.isArray(payload.checkIns) ? payload.checkIns : [];
        } else {
          issues.push('check-iny miesiaca');
        }

        let nextYearCheckins: CheckIn[] = [];
        if (yearRes.ok) {
          const payload = (await yearRes.json()) as { checkIns?: CheckIn[] };
          nextYearCheckins = Array.isArray(payload.checkIns) ? payload.checkIns : [];
        } else {
          issues.push('check-iny roku');
        }

        setWeeklyReport(nextWeekly);
        setMonthlyReport(nextMonthly);
        setWeekCheckins(nextWeekCheckins);
        setMonthCheckins(nextMonthCheckins);
        setYearCheckins(nextYearCheckins);

        if (issues.length > 0) {
          setError(`Czesc danych review jest niedostepna: ${issues.join(', ')}.`);
        }
      } catch {
        setWeeklyReport(emptyReport('Raport tygodniowy chwilowo niedostepny.'));
        setMonthlyReport(emptyReport('Raport miesieczny chwilowo niedostepny.'));
        setWeekCheckins([]);
        setMonthCheckins([]);
        setYearCheckins([]);
        setError('Nie udalo sie pobrac danych review.');
      }
    };

    void load();
  }, []);

  const weeklyGain = useMemo(() => topFactor(weeklyReport, 'positive'), [weeklyReport]);
  const weeklyRisk = useMemo(() => topFactor(weeklyReport, 'negative'), [weeklyReport]);
  const weeklyAction = useMemo(() => nextTestLine(weeklyReport), [weeklyReport]);
  const weeklySummary = useMemo(() => dataSummaryLine(weeklyReport, 'Tydzien'), [weeklyReport]);
  const monthlySummary = useMemo(() => dataSummaryLine(monthlyReport, 'Miesiac'), [monthlyReport]);

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
    const values = weekDays.map((day) => weekAvg.get(day.key)?.energy ?? null);
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
        <Banner tone="danger" title="Blad Review">
          {error}
        </Banner>
      )}

      <Card
        tone="strong"
        title="Review cockpit: 2x / 5x / 10x"
        subtitle="Domyslnie dzialasz w 1x (Dzien). Tu tylko potwierdzasz wzorce."
        actions={
          <div className="mode-switch">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')} type="button">
              2x Tydzien
            </button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')} type="button">
              5x Miesiac
            </button>
            <button className={period === 'year' ? 'active' : ''} onClick={() => setPeriod('year')} type="button">
              10x Rok
            </button>
          </div>
        }
      >
        <Banner tone="info" title="Jakosc danych (tydzien)">
          {weeklySummary}
        </Banner>

        {weeklyReport?.insufficientData ? (
          <Banner tone="info" title="Malo danych, ale jest wartosc">
            {weeklyReport.message} Minimum to {weeklyReport.thresholds.low.minUniqueDays} unikalnych dni.
          </Banner>
        ) : (
          <div className="grid grid-2">
            <Card title="Top gain" subtitle="To hipoteza. Ale dobra hipoteza oszczedza tydzien.">
              <p>{weeklyGain ? weeklyGain.factor : 'Brak top gain w tym oknie.'}</p>
              <small>
                {weeklyGain
                  ? `Lag ${weeklyGain.lag} • ${confidenceLabel(weeklyGain.confidence)} sygnal (${weeklyGain.confidence}%)`
                  : 'Nie przyczynowosc. Kierunek.'}
              </small>
              {weeklyGain && <small>{weeklyGain.explanation}</small>}
            </Card>
            <Card title="Top risk" subtitle="Nie przyczynowosc. Kierunek.">
              <p>{weeklyRisk ? weeklyRisk.factor : 'Brak top risk w tym oknie.'}</p>
              <small>
                {weeklyRisk
                  ? `Lag ${weeklyRisk.lag} • ${confidenceLabel(weeklyRisk.confidence)} sygnal (${weeklyRisk.confidence}%)`
                  : 'Monitoruj 3 sygnaly core.'}
              </small>
              {weeklyRisk && <small>{weeklyRisk.explanation}</small>}
            </Card>
          </div>
        )}

        <Banner tone="warning" title="Interpretacja">
          {weeklyReport?.message ?? 'Wnioski sa hipotezami statystycznymi, nie dowodem przyczynowosci.'}
        </Banner>

        <Banner tone="warning" title="Next test">
          {weeklyAction}
        </Banner>
      </Card>

      {period === 'week' && (
        <Card tone="elevated" title="Tydzien (2x)" subtitle="Nie optymalizujesz dnia. Stabilizujesz tydzien.">
          <div className="review-trend">
            <svg aria-label="Energy trend" viewBox="0 0 700 180">
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f6b43" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#1f6b43" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[2, 4, 6, 8].map((level) => (
                <g key={`grid-${level}`}>
                  <line
                    x1="0"
                    x2={TREND_WIDTH}
                    y1={trendY(level)}
                    y2={trendY(level)}
                    stroke="#7f9389"
                    strokeOpacity="0.35"
                    strokeDasharray="5 4"
                    strokeWidth="1"
                  />
                  <text x={TREND_WIDTH - 16} y={trendY(level) - 4} fill="#365548" fontSize="11">
                    {level}
                  </text>
                </g>
              ))}

              {weekTrend.areaPath && <path d={weekTrend.areaPath} fill="url(#trendFill)" stroke="none" />}
              <path d={weekTrend.path} fill="none" stroke="#1f6b43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {weekTrend.points.map((point, index) =>
                point.value === null || point.y === null ? (
                  <circle
                    cx={point.x}
                    cy={TREND_BASELINE}
                    fill="transparent"
                    key={`${point.x}-${index}`}
                    r="4.2"
                    stroke="#8ca59a"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  >
                    <title>Brak wpisu</title>
                  </circle>
                ) : (
                  <circle cx={point.x} cy={point.y} fill="#1f6b43" key={`${point.x}-${index}`} r="4.8">
                    <title>{`Energy: ${point.value}`}</title>
                  </circle>
                )
              )}
            </svg>
          </div>
          <small>Zapisane dni energii: {weekTrend.recordedDays}/7. Braki danych nie sa rysowane jako zero.</small>

          <div className="week-heatmap">
            {weekDays.map((day) => {
              const avg = weekAvg.get(day.key);
              return (
                <article className="week-cell" key={day.key}>
                  <strong>{day.label}</strong>
                  <div className={`heat-chip ${avg ? heatClass(avg.mood) : 'heat-empty'}`}>
                    Mood {avg ? avg.mood : '-'}
                  </div>
                  <div className={`heat-chip ${avg ? heatClass(avg.energy) : 'heat-empty'}`}>
                    Energy {avg ? avg.energy : '-'}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="grid grid-2">
            <Card title="Top 1 Gain">
              <p>{weeklyGain?.factor ?? 'Brak sygnalu gain. Zbieraj kolejne dni.'}</p>
            </Card>
            <Card title="Top 1 Risk">
              <p>{weeklyRisk?.factor ?? 'Brak sygnalu risk. Dodaj jeden trigger binarny.'}</p>
            </Card>
          </div>

          <div className="panel-subtle">
            <strong>Eksperyment na przyszly tydzien (1)</strong>
            <small>{weeklyAction}</small>
            <Link className="review-link" href="/experiments">
              Ustaw eksperyment na ten tydzien
            </Link>
          </div>
        </Card>
      )}

      {period === 'month' && (
        <Card tone="elevated" title="Miesiac (5x)" subtitle="Trajektoria: stabilne vs niestabilne dni.">
          <Banner tone="info" title="Jakosc danych (miesiac)">
            {monthlySummary}
          </Banner>

          {monthlyReport?.insufficientData && (
            <Banner tone="info" title="Malo danych miesiecznych">
              {monthlyReport.message}
            </Banner>
          )}

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
            Najczestszy trigger miesiaca: <strong>{topFactor(monthlyReport, 'negative')?.factor ?? monthGrid.trigger}</strong>
          </small>
          <small>{monthlyReport?.message ?? 'Brak komunikatu raportu miesiecznego.'}</small>
          {monthlyReport?.macroPatterns[0] && (
            <small>
              Wzorzec lancuchowy: <strong>{monthlyReport.macroPatterns[0].title}</strong> (
              {monthlyReport.macroPatterns[0].confidence}%)
            </small>
          )}
          <Link className="review-link" href="/experiments">
            Wybierz 1 zasade na kolejny miesiac
          </Link>
        </Card>
      )}

      {period === 'year' && (
        <Card tone="elevated" title="Rok (10x)" subtitle="Kompas strategiczny, nie ekran codziennej optymalizacji.">
          <div className="year-grid">
            {yearStats.months.map((month) => (
              <article className="year-cell" key={month.month}>
                <small>{monthName(month.month)}</small>
                <strong>ESI {month.stability}</strong>
              </article>
            ))}
          </div>

          <div className="panel-subtle">
            <strong>Rok to 12 iteracji. Dekada to zmiana systemu.</strong>
            <small>Iteracje eksperymentow: {yearStats.experimentsCount}</small>
            <small>Powroty na tor po spadku: {yearStats.recoveries}</small>
            <Link className="review-link" href="/today">
              Wroc do Dzisiaj
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
