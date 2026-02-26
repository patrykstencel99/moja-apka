import { ActivityType } from '@prisma/client';

import { plusDays } from '@/lib/date';
import type { Insight, MacroPattern } from '@/types/domain';

type CheckInValue = {
  booleanValue: boolean | null;
  numericValue: number | null;
  activity: {
    id: string;
    name: string;
    type: ActivityType;
  };
};

export type CheckInForInsights = {
  localDate: string;
  mood: number;
  energy: number;
  createdAt: Date;
  values: CheckInValue[];
};

type Window = 'weekly' | 'monthly';
type DataVolume = 'low' | 'medium' | 'high';

const MIN_UNIQUE_DAYS_FOR_INSIGHTS = 7;

const HIGH_DATA_RULES: Record<
  Window,
  { minUniqueDays: number; minCheckins: number; minTrackedFactors: number }
> = {
  weekly: {
    minUniqueDays: 7,
    minCheckins: 12,
    minTrackedFactors: 4
  },
  monthly: {
    minUniqueDays: 21,
    minCheckins: 28,
    minTrackedFactors: 5
  }
};

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const m = mean(values);
  const variance = values.reduce((acc, n) => acc + (n - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rank(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = Array<number>(values.length).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) {
      j += 1;
    }
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].index] = avgRank;
    }
    i = j;
  }

  return ranks;
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) {
    return 0;
  }
  const mx = mean(xs);
  const my = mean(ys);

  let numerator = 0;
  let sx = 0;
  let sy = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    numerator += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }

  if (sx === 0 || sy === 0) {
    return 0;
  }

  return numerator / Math.sqrt(sx * sy);
}

function spearman(xs: number[], ys: number[]): number {
  return pearson(rank(xs), rank(ys));
}

export function confidenceScore(params: { sampleSize: number; strength: number; stability: number }): number {
  const sampleFactor = clamp(params.sampleSize / 30, 0, 1);
  const strengthFactor = clamp(Math.abs(params.strength), 0, 1);
  const stabilityFactor = clamp(params.stability, 0, 1);
  return Math.round((sampleFactor * 0.45 + strengthFactor * 0.45 + stabilityFactor * 0.1) * 100);
}

function combinedState(mood: number, energy: number): number {
  return (mood + energy) / 2;
}

function dailyStateMap(checkins: CheckInForInsights[]): Map<string, { mood: number; energy: number; combined: number }> {
  const grouped = new Map<string, Array<{ mood: number; energy: number }>>();

  for (const checkIn of checkins) {
    const existing = grouped.get(checkIn.localDate) ?? [];
    existing.push({ mood: checkIn.mood, energy: checkIn.energy });
    grouped.set(checkIn.localDate, existing);
  }

  const map = new Map<string, { mood: number; energy: number; combined: number }>();
  for (const [date, values] of grouped.entries()) {
    const mood = mean(values.map((v) => v.mood));
    const energy = mean(values.map((v) => v.energy));
    map.set(date, { mood, energy, combined: combinedState(mood, energy) });
  }

  return map;
}

function activityCatalog(checkins: CheckInForInsights[]) {
  const map = new Map<string, { name: string; type: ActivityType }>();
  for (const checkIn of checkins) {
    for (const value of checkIn.values) {
      map.set(value.activity.id, {
        name: value.activity.name,
        type: value.activity.type
      });
    }
  }
  return map;
}

function classifyDataVolume(params: {
  window: Window;
  uniqueDays: number;
  totalCheckins: number;
  trackedFactors: number;
}): DataVolume {
  const { window, uniqueDays, totalCheckins, trackedFactors } = params;
  if (uniqueDays < MIN_UNIQUE_DAYS_FOR_INSIGHTS) {
    return 'low';
  }

  const highRules = HIGH_DATA_RULES[window];
  if (
    uniqueDays >= highRules.minUniqueDays &&
    totalCheckins >= highRules.minCheckins &&
    trackedFactors >= highRules.minTrackedFactors
  ) {
    return 'high';
  }

  return 'medium';
}

function effectStrengthLabel(effect: number): string {
  const abs = Math.abs(effect);
  if (abs >= 0.9) {
    return 'mocna';
  }
  if (abs >= 0.45) {
    return 'srednia';
  }
  return 'slaba';
}

function reportMessage(params: {
  insufficientData: boolean;
  dataVolume: DataVolume;
  insightCount: number;
}): string {
  const { insufficientData, dataVolume, insightCount } = params;

  if (insufficientData) {
    return `Za malo danych. Wprowadzaj wpisy przez minimum ${MIN_UNIQUE_DAYS_FOR_INSIGHTS} dni, aby zobaczyc insighty.`;
  }

  if (insightCount === 0) {
    return dataVolume === 'high'
      ? 'Duzo danych, ale brak stabilnych sygnalow. To moze oznaczac szum albo zbyt malo zroznicowane eksperymenty.'
      : 'Dane sa, ale sygnaly sa jeszcze slabe. Kontynuuj tracking i testuj bardziej kontrastowe eksperymenty.';
  }

  if (dataVolume === 'high') {
    return 'Duzo danych. Traktuj insighty jako priorytetowe hipotezy na kolejne iteracje.';
  }
  return 'Wnioski sa hipotezami statystycznymi, nie dowodem przyczynowosci.';
}

function computeBooleanInsight(params: {
  activityName: string;
  lag: 0 | 1;
  observations: Array<{ x: number; y: number }>;
  window: Window;
  stability: number;
}): Insight | null {
  const { observations, activityName, lag, window, stability } = params;
  if (observations.length < 5) {
    return null;
  }

  const trueGroup = observations.filter((o) => o.x === 1).map((o) => o.y);
  const falseGroup = observations.filter((o) => o.x === 0).map((o) => o.y);

  if (trueGroup.length < 2 || falseGroup.length < 2) {
    return null;
  }

  const diff = mean(trueGroup) - mean(falseGroup);
  const meanTrue = mean(trueGroup);
  const meanFalse = mean(falseGroup);
  const pooledStd = Math.sqrt((std(trueGroup) ** 2 + std(falseGroup) ** 2) / 2);
  const effect = pooledStd === 0 ? diff / 10 : diff / pooledStd;

  const confidence = confidenceScore({
    sampleSize: observations.length,
    strength: clamp(Math.abs(effect) / 1.5, 0, 1),
    stability
  });

  if (confidence < 35) {
    return null;
  }

  return {
    factor: activityName,
    metric: 'combined',
    direction: diff >= 0 ? 'positive' : 'negative',
    confidence,
    lag,
    window,
    effect,
    explanation: `Sredni stan z "${activityName}" to ${meanTrue.toFixed(2)} vs ${meanFalse.toFixed(2)} bez sygnalu (n=${observations.length}, sila ${effectStrengthLabel(effect)}).`
  };
}

function computeNumericInsight(params: {
  activityName: string;
  lag: 0 | 1;
  observations: Array<{ x: number; y: number }>;
  window: Window;
  stability: number;
}): Insight | null {
  const { observations, activityName, lag, window, stability } = params;
  if (observations.length < 5) {
    return null;
  }

  const x = observations.map((o) => o.x);
  const y = observations.map((o) => o.y);
  const corr = spearman(x, y);

  const confidence = confidenceScore({
    sampleSize: observations.length,
    strength: Math.abs(corr),
    stability
  });

  if (confidence < 35 || Math.abs(corr) < 0.1) {
    return null;
  }

  return {
    factor: activityName,
    metric: 'combined',
    direction: corr >= 0 ? 'positive' : 'negative',
    confidence,
    lag,
    window,
    effect: corr,
    explanation: `Korelacja Spearmana dla "${activityName}" to ${corr.toFixed(2)} (n=${observations.length}, sila ${effectStrengthLabel(corr)}).`
  };
}

function buildMacroPatterns(checkins: CheckInForInsights[]): MacroPattern[] {
  const dailyMap = dailyStateMap(checkins);
  const dayActivityFlags = new Map<string, Set<string>>();

  for (const checkIn of checkins) {
    const set = dayActivityFlags.get(checkIn.localDate) ?? new Set<string>();
    for (const value of checkIn.values) {
      if (value.activity.type === ActivityType.BOOLEAN && value.booleanValue) {
        set.add(value.activity.name);
      }
      if (value.activity.type === ActivityType.NUMERIC_0_10 && (value.numericValue ?? 0) >= 7) {
        set.add(`${value.activity.name} (wysoka intensywnosc)`);
      }
    }
    dayActivityFlags.set(checkIn.localDate, set);
  }

  const counters = new Map<string, { hits: number; avgDrop: number }>();

  for (const [day, state] of dailyMap.entries()) {
    const nextDay = plusDays(day, 1);
    const nextState = dailyMap.get(nextDay);
    if (!nextState) {
      continue;
    }

    const drop = state.combined - nextState.combined;
    if (drop < 1) {
      continue;
    }

    const activities = dayActivityFlags.get(day) ?? new Set<string>();
    for (const activity of activities) {
      const existing = counters.get(activity) ?? { hits: 0, avgDrop: 0 };
      const hits = existing.hits + 1;
      const avgDrop = (existing.avgDrop * existing.hits + drop) / hits;
      counters.set(activity, { hits, avgDrop });
    }
  }

  return Array.from(counters.entries())
    .sort((a, b) => b[1].hits * b[1].avgDrop - a[1].hits * a[1].avgDrop)
    .slice(0, 3)
    .map(([activity, stat]) => ({
      title: `Mozliwy wzorzec lancuchowy: ${activity}`,
      description: `Po dniach z "${activity}" czesto widoczny jest spadek stanu kolejnego dnia (sredni spadek ${stat.avgDrop.toFixed(2)}).`,
      confidence: clamp(Math.round((stat.hits / 5) * 100), 20, 90)
    }));
}

export function buildInsightsReport(params: {
  checkins: CheckInForInsights[];
  window: Window;
  from: string;
  to: string;
}) {
  const { checkins, window, from, to } = params;
  const uniqueDays = new Set(checkins.map((c) => c.localDate)).size;
  const totalCheckins = checkins.length;
  const catalog = activityCatalog(checkins);
  const trackedFactors = catalog.size;
  const dataVolume = classifyDataVolume({
    window,
    uniqueDays,
    totalCheckins,
    trackedFactors
  });
  const thresholds = {
    low: {
      minUniqueDays: MIN_UNIQUE_DAYS_FOR_INSIGHTS
    },
    high: HIGH_DATA_RULES[window]
  };

  if (dataVolume === 'low') {
    return {
      from,
      to,
      uniqueDays,
      totalCheckins,
      trackedFactors,
      dataVolume,
      thresholds,
      insufficientData: true,
      message: reportMessage({
        insufficientData: true,
        dataVolume,
        insightCount: 0
      }),
      positive: [] as Insight[],
      negative: [] as Insight[],
      macroPatterns: [] as MacroPattern[]
    };
  }

  const dailyStates = dailyStateMap(checkins);
  const insights: Insight[] = [];

  for (const [activityId, info] of catalog.entries()) {
    const lagObservations: Record<'0' | '1', Array<{ x: number; y: number }>> = {
      '0': [],
      '1': []
    };

    for (const checkIn of checkins) {
      const value = checkIn.values.find((v) => v.activity.id === activityId);
      if (!value) {
        continue;
      }

      if (info.type === ActivityType.BOOLEAN && value.booleanValue === null) {
        continue;
      }
      if (info.type === ActivityType.NUMERIC_0_10 && value.numericValue === null) {
        continue;
      }

      const x = info.type === ActivityType.BOOLEAN ? (value.booleanValue ? 1 : 0) : (value.numericValue ?? 0);
      const y0 = combinedState(checkIn.mood, checkIn.energy);
      lagObservations['0'].push({ x, y: y0 });

      const nextDate = plusDays(checkIn.localDate, 1);
      const next = dailyStates.get(nextDate);
      if (next) {
        lagObservations['1'].push({ x, y: next.combined });
      }
    }

    const lag0Temp =
      info.type === ActivityType.BOOLEAN
        ? computeBooleanInsight({
            activityName: info.name,
            lag: 0,
            observations: lagObservations['0'],
            window,
            stability: 0.8
          })
        : computeNumericInsight({
            activityName: info.name,
            lag: 0,
            observations: lagObservations['0'],
            window,
            stability: 0.8
          });

    const lag1Temp =
      info.type === ActivityType.BOOLEAN
        ? computeBooleanInsight({
            activityName: info.name,
            lag: 1,
            observations: lagObservations['1'],
            window,
            stability: 0.8
          })
        : computeNumericInsight({
            activityName: info.name,
            lag: 1,
            observations: lagObservations['1'],
            window,
            stability: 0.8
          });

    const stabilityBoost =
      lag0Temp && lag1Temp && lag0Temp.direction === lag1Temp.direction
        ? 1
        : lag0Temp || lag1Temp
          ? 0.7
          : 0;

    if (lag0Temp) {
      lag0Temp.confidence = confidenceScore({
        sampleSize: lagObservations['0'].length,
        strength: Math.min(1, Math.abs(lag0Temp.effect)),
        stability: stabilityBoost
      });
      insights.push(lag0Temp);
    }

    if (lag1Temp) {
      lag1Temp.confidence = confidenceScore({
        sampleSize: lagObservations['1'].length,
        strength: Math.min(1, Math.abs(lag1Temp.effect)),
        stability: stabilityBoost
      });
      insights.push(lag1Temp);
    }
  }

  const ranked = insights
    .filter((i) => i.confidence >= 35)
    .sort((a, b) => Math.abs(b.effect) * b.confidence - Math.abs(a.effect) * a.confidence);

  const deduplicatedByFactor = new Map<string, Insight>();
  for (const item of ranked) {
    const key = `${item.factor}:${item.direction}`;
    if (!deduplicatedByFactor.has(key)) {
      deduplicatedByFactor.set(key, item);
    }
  }

  const deduplicated = Array.from(deduplicatedByFactor.values());
  const positive = deduplicated.filter((i) => i.direction === 'positive').slice(0, 3);
  const negative = deduplicated.filter((i) => i.direction === 'negative').slice(0, 3);
  const insightCount = positive.length + negative.length;
  const macroPatterns = dataVolume === 'high' ? buildMacroPatterns(checkins) : [];

  return {
    from,
    to,
    uniqueDays,
    totalCheckins,
    trackedFactors,
    dataVolume,
    thresholds,
    insufficientData: false,
    message: reportMessage({
      insufficientData: false,
      dataVolume,
      insightCount
    }),
    positive,
    negative,
    macroPatterns
  };
}
