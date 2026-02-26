import {
  BadgeType,
  CompetitionTier,
  LeaderboardMetric,
  type BadgeAward,
  type CompetitionDailyStat
} from '@prisma/client';
import { addDays, format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

import { dayDiff, plusDays } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import type {
  BadgeProgress,
  CompetitionLeaderboardPayload,
  CompetitionLeaderboardRow,
  CompetitionMetric,
  CompetitionPeriod,
  CompetitionTierUi
} from '@/types/competition';

const SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
const BASE_POINTS_PER_ENTRY = 10;
const MAX_CREDITED_CHECKINS = 3;

const PERIOD_VALUES: CompetitionPeriod[] = [
  '7d',
  '30d',
  '90d',
  '365d',
  'this_week',
  'this_month',
  'this_year',
  '5y',
  'all_time'
];

const METRIC_VALUES: CompetitionMetric[] = ['score', 'maxStreak', 'totalCheckIns'];

type BadgeDefinition = {
  badge: BadgeType;
  title: string;
  description: string;
  target: number;
  current: (metrics: BadgeMetrics) => number;
};

type BadgeMetrics = {
  totalCheckIns: number;
  maxStreak: number;
  daysWithThreeCheckins: number;
  maxThreeCheckinRun: number;
  maxTierValue: number;
  maxT3MaintainedRun: number;
  journalDays: number;
  hasComebackAfter3: boolean;
  hasComebackAfter7: boolean;
};

type DailyAggregate = {
  rawCheckIns: number;
  journalEntries: number;
};

type PeriodRange = {
  from: string;
  to: string;
};

type LeaderboardAggregate = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarSeed: string | null;
  score: number;
  totalCheckIns: number;
  latestLocalDate: string;
  dates: string[];
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    badge: BadgeType.FIRST_CHECKIN,
    title: 'Pierwszy ruch',
    description: 'Wykonaj pierwszy check-in.',
    target: 1,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.CHECKINS_7,
    title: 'Siedem wpisów',
    description: 'Zbierz 7 check-inów.',
    target: 7,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.CHECKINS_30,
    title: 'Trzydzieści wpisów',
    description: 'Zbierz 30 check-inów.',
    target: 30,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.CHECKINS_100,
    title: 'Sto wpisów',
    description: 'Zbierz 100 check-inów.',
    target: 100,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.CHECKINS_300,
    title: 'Trzysta wpisów',
    description: 'Zbierz 300 check-inów.',
    target: 300,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.CHECKINS_1000,
    title: 'Tysiąc wpisów',
    description: 'Zbierz 1000 check-inów.',
    target: 1000,
    current: (m) => m.totalCheckIns
  },
  {
    badge: BadgeType.STREAK_3,
    title: 'Seria 3',
    description: 'Utrzymaj serię 3 dni.',
    target: 3,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_7,
    title: 'Seria 7',
    description: 'Utrzymaj serię 7 dni.',
    target: 7,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_14,
    title: 'Seria 14',
    description: 'Utrzymaj serię 14 dni.',
    target: 14,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_21,
    title: 'Seria 21',
    description: 'Utrzymaj serię 21 dni.',
    target: 21,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_30,
    title: 'Seria 30',
    description: 'Utrzymaj serię 30 dni.',
    target: 30,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_60,
    title: 'Seria 60',
    description: 'Utrzymaj serię 60 dni.',
    target: 60,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_100,
    title: 'Seria 100',
    description: 'Utrzymaj serię 100 dni.',
    target: 100,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.STREAK_365,
    title: 'Seria 365',
    description: 'Utrzymaj serię 365 dni.',
    target: 365,
    current: (m) => m.maxStreak
  },
  {
    badge: BadgeType.THREE_ENTRIES_ONE_DAY,
    title: 'Mocny dzień',
    description: 'Zrób 3 check-iny jednego dnia.',
    target: 1,
    current: (m) => m.daysWithThreeCheckins
  },
  {
    badge: BadgeType.THREE_CHECKINS_7_DAYS,
    title: '3x przez 7 dni',
    description: 'Zbierz 7 dni z trzema check-inami.',
    target: 7,
    current: (m) => m.daysWithThreeCheckins
  },
  {
    badge: BadgeType.THREE_CHECKINS_30_DAYS,
    title: '3x przez 30 dni',
    description: 'Zbierz 30 dni z trzema check-inami.',
    target: 30,
    current: (m) => m.daysWithThreeCheckins
  },
  {
    badge: BadgeType.TIER_T2_UNLOCK,
    title: 'Odblokowano T2',
    description: 'Wejdź do tieru T2.',
    target: 2,
    current: (m) => m.maxTierValue
  },
  {
    badge: BadgeType.TIER_T3_UNLOCK,
    title: 'Odblokowano T3',
    description: 'Wejdź do tieru T3.',
    target: 3,
    current: (m) => m.maxTierValue
  },
  {
    badge: BadgeType.TIER_T3_KEEP_7,
    title: 'T3 przez 7 dni',
    description: 'Utrzymaj T3 przez 7 kolejnych dni.',
    target: 7,
    current: (m) => m.maxT3MaintainedRun
  },
  {
    badge: BadgeType.TIER_T3_KEEP_30,
    title: 'T3 przez 30 dni',
    description: 'Utrzymaj T3 przez 30 kolejnych dni.',
    target: 30,
    current: (m) => m.maxT3MaintainedRun
  },
  {
    badge: BadgeType.COMEBACK_3_DAYS,
    title: 'Comeback 3+',
    description: 'Wróć po przerwie min. 3 dni.',
    target: 1,
    current: (m) => (m.hasComebackAfter3 ? 1 : 0)
  },
  {
    badge: BadgeType.COMEBACK_7_DAYS,
    title: 'Comeback 7+',
    description: 'Wróć po przerwie min. 7 dni.',
    target: 1,
    current: (m) => (m.hasComebackAfter7 ? 1 : 0)
  },
  {
    badge: BadgeType.PERFECT_WEEK,
    title: 'Perfect Week',
    description: '7 dni z rzędu po 3 check-iny.',
    target: 7,
    current: (m) => m.maxThreeCheckinRun
  },
  {
    badge: BadgeType.JOURNAL_30_DAYS,
    title: 'Piszę regularnie',
    description: '30 dni z notatką w dzienniku.',
    target: 30,
    current: (m) => m.journalDays
  }
];

function normalizeDisplayName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pl-PL')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-');
}

function displayNameFallback(userId: string) {
  return `Gracz-${userId.slice(-6)}`;
}

function normalizeDisplayNameSafe(value: string, fallbackSeed: string) {
  const normalized = normalizeDisplayName(value);
  if (normalized.length > 0) {
    return normalized;
  }
  return normalizeDisplayName(fallbackSeed);
}

async function ensureDisplayNames() {
  const [usersMissingName, usersWithName] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ displayName: null }, { displayNameNormalized: null }]
      },
      select: {
        id: true,
        displayName: true,
        avatarSeed: true
      }
    }),
    prisma.user.findMany({
      where: {
        displayNameNormalized: {
          not: null
        }
      },
      select: {
        displayNameNormalized: true
      }
    })
  ]);

  if (usersMissingName.length === 0) {
    return { patchedUsers: 0 };
  }

  const reserved = new Set(
    usersWithName
      .map((user) => user.displayNameNormalized)
      .filter((value): value is string => Boolean(value))
  );

  for (const user of usersMissingName) {
    const rawBase = (user.displayName?.trim() || displayNameFallback(user.id)).slice(0, 24);
    const fallbackBase = displayNameFallback(user.id);
    let attempt = 0;
    let nextDisplayName = rawBase;
    let nextNormalized = normalizeDisplayNameSafe(nextDisplayName, fallbackBase);

    while (reserved.has(nextNormalized)) {
      attempt += 1;
      const suffix = `-${attempt}`;
      const maxBaseLength = Math.max(1, 24 - suffix.length);
      nextDisplayName = `${rawBase.slice(0, maxBaseLength)}${suffix}`;
      nextNormalized = normalizeDisplayNameSafe(nextDisplayName, fallbackBase);
    }

    reserved.add(nextNormalized);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: nextDisplayName,
        displayNameNormalized: nextNormalized,
        avatarSeed: user.avatarSeed ?? nextNormalized
      },
      select: {
        id: true
      }
    });
  }

  return { patchedUsers: usersMissingName.length };
}

function currentDateString(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

function streakToTier(streak: number): CompetitionTier {
  if (streak >= 15) {
    return CompetitionTier.T3;
  }
  if (streak >= 5) {
    return CompetitionTier.T2;
  }
  return CompetitionTier.T1;
}

function tierToUi(tier: CompetitionTier): CompetitionTierUi {
  return tier;
}

export function competitionTierFromStreak(streak: number): CompetitionTierUi {
  return tierToUi(streakToTier(streak));
}

function tierCapPercent(tier: CompetitionTier): number {
  if (tier === CompetitionTier.T1) {
    return 60;
  }
  if (tier === CompetitionTier.T2) {
    return 120;
  }
  return 200;
}

function toMetricEnum(metric: CompetitionMetric): LeaderboardMetric {
  if (metric === 'maxStreak') {
    return LeaderboardMetric.MAX_STREAK;
  }
  if (metric === 'totalCheckIns') {
    return LeaderboardMetric.TOTAL_CHECKINS;
  }
  return LeaderboardMetric.SCORE;
}

function fromMetricEnum(metric: LeaderboardMetric): CompetitionMetric {
  if (metric === LeaderboardMetric.MAX_STREAK) {
    return 'maxStreak';
  }
  if (metric === LeaderboardMetric.TOTAL_CHECKINS) {
    return 'totalCheckIns';
  }
  return 'score';
}

function getRangeForPeriod(period: CompetitionPeriod, now = new Date()): PeriodRange | null {
  const today = currentDateString(now);

  if (period === 'all_time') {
    return null;
  }

  if (period === '7d') {
    return { from: format(addDays(now, -6), 'yyyy-MM-dd'), to: today };
  }
  if (period === '30d') {
    return { from: format(addDays(now, -29), 'yyyy-MM-dd'), to: today };
  }
  if (period === '90d') {
    return { from: format(addDays(now, -89), 'yyyy-MM-dd'), to: today };
  }
  if (period === '365d') {
    return { from: format(addDays(now, -364), 'yyyy-MM-dd'), to: today };
  }
  if (period === '5y') {
    return { from: format(addDays(now, -1824), 'yyyy-MM-dd'), to: today };
  }
  if (period === 'this_week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    return { from: format(weekStart, 'yyyy-MM-dd'), to: today };
  }
  if (period === 'this_month') {
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today };
  }

  return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: today };
}

function sanitizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 100;
  }
  return Math.max(1, Math.min(500, Math.trunc(limit)));
}

function getRawCount(byDate: Map<string, DailyAggregate>, localDate: string): number {
  return byDate.get(localDate)?.rawCheckIns ?? 0;
}

function getJournalCount(byDate: Map<string, DailyAggregate>, localDate: string): number {
  return byDate.get(localDate)?.journalEntries ?? 0;
}

function countLastNDaysAtLeast(byDate: Map<string, DailyAggregate>, localDate: string, days: number, minValue: number): number {
  let count = 0;
  for (let index = 0; index < days; index += 1) {
    const date = plusDays(localDate, -index);
    if (getRawCount(byDate, date) >= minValue) {
      count += 1;
    }
  }
  return count;
}

function allLastNDaysAtLeast(byDate: Map<string, DailyAggregate>, localDate: string, days: number, minValue: number): boolean {
  for (let index = 0; index < days; index += 1) {
    const date = plusDays(localDate, -index);
    if (getRawCount(byDate, date) < minValue) {
      return false;
    }
  }
  return true;
}

function applyBonus(activeMultipliers: string[], current: number, code: string, bonusPercent: number): number {
  activeMultipliers.push(code);
  return current + bonusPercent;
}

function calculateBadgeMetrics(rows: CompetitionDailyStat[]): BadgeMetrics {
  let totalCheckIns = 0;
  let maxStreak = 0;
  let daysWithThreeCheckins = 0;
  let journalDays = 0;
  let maxTierValue = 1;
  let maxThreeCheckinRun = 0;
  let currentThreeCheckinRun = 0;
  let maxT3MaintainedRun = 0;
  let currentT3MaintainedRun = 0;
  let hasComebackAfter3 = false;
  let hasComebackAfter7 = false;

  const sorted = [...rows].sort((a, b) => a.localDate.localeCompare(b.localDate));

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    totalCheckIns += row.rawCheckIns;
    maxStreak = Math.max(maxStreak, row.streak);
    daysWithThreeCheckins += row.rawCheckIns >= 3 ? 1 : 0;
    journalDays += row.journalEntries > 0 ? 1 : 0;

    const tierValue = row.tier === CompetitionTier.T3 ? 3 : row.tier === CompetitionTier.T2 ? 2 : 1;
    maxTierValue = Math.max(maxTierValue, tierValue);

    if (row.rawCheckIns >= 3) {
      const previous = sorted[index - 1];
      if (previous && dayDiff(previous.localDate, row.localDate) === 1 && previous.rawCheckIns >= 3) {
        currentThreeCheckinRun += 1;
      } else {
        currentThreeCheckinRun = 1;
      }
      maxThreeCheckinRun = Math.max(maxThreeCheckinRun, currentThreeCheckinRun);
    } else {
      currentThreeCheckinRun = 0;
    }

    if (row.tier === CompetitionTier.T3 && row.t3Maintained) {
      const previous = sorted[index - 1];
      if (previous && dayDiff(previous.localDate, row.localDate) === 1 && previous.tier === CompetitionTier.T3 && previous.t3Maintained) {
        currentT3MaintainedRun += 1;
      } else {
        currentT3MaintainedRun = 1;
      }
      maxT3MaintainedRun = Math.max(maxT3MaintainedRun, currentT3MaintainedRun);
    } else {
      currentT3MaintainedRun = 0;
    }

    const previous = sorted[index - 1];
    if (previous) {
      const breakDays = dayDiff(previous.localDate, row.localDate) - 1;
      if (breakDays >= 3) {
        hasComebackAfter3 = true;
      }
      if (breakDays >= 7) {
        hasComebackAfter7 = true;
      }
    }
  }

  return {
    totalCheckIns,
    maxStreak,
    daysWithThreeCheckins,
    maxThreeCheckinRun,
    maxTierValue,
    maxT3MaintainedRun,
    journalDays,
    hasComebackAfter3,
    hasComebackAfter7
  };
}

async function ensureBadge(userId: string, badge: BadgeType) {
  await prisma.badgeAward.upsert({
    where: {
      userId_badge: {
        userId,
        badge
      }
    },
    create: {
      userId,
      badge
    },
    update: {}
  });
}

async function awardBadgesForUser(userId: string, rows: CompetitionDailyStat[]) {
  const metrics = calculateBadgeMetrics(rows);

  for (const definition of BADGE_DEFINITIONS) {
    if (definition.current(metrics) >= definition.target) {
      await ensureBadge(userId, definition.badge);
    }
  }
}

export function resolveCompetitionMetric(value: string | null | undefined): CompetitionMetric {
  if (value && METRIC_VALUES.includes(value as CompetitionMetric)) {
    return value as CompetitionMetric;
  }
  return 'score';
}

export function resolveCompetitionPeriod(value: string | null | undefined): CompetitionPeriod {
  if (value && PERIOD_VALUES.includes(value as CompetitionPeriod)) {
    return value as CompetitionPeriod;
  }
  return '30d';
}

export async function markLeaderboardSnapshotsStale() {
  await prisma.leaderboardSnapshot.updateMany({
    data: {
      stale: true
    }
  });
}

export async function recomputeUserCompetitionStats(userId: string) {
  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: [{ localDate: 'asc' }, { createdAt: 'asc' }],
    select: {
      localDate: true,
      journal: true
    }
  });

  const byDate = new Map<string, DailyAggregate>();
  for (const checkIn of checkIns) {
    const existing = byDate.get(checkIn.localDate) ?? { rawCheckIns: 0, journalEntries: 0 };
    existing.rawCheckIns += 1;
    if (checkIn.journal && checkIn.journal.trim().length > 0) {
      existing.journalEntries += 1;
    }
    byDate.set(checkIn.localDate, existing);
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

  const rows: Array<
    Omit<CompetitionDailyStat, 'id' | 'createdAt' | 'updatedAt' | 'user'> & {
      activeMultipliers: string[];
    }
  > = [];

  let currentStreak = 0;
  let previousDate: string | null = null;

  for (const localDate of sortedDates) {
    const rawCheckIns = getRawCount(byDate, localDate);
    const journalEntries = getJournalCount(byDate, localDate);

    if (!previousDate) {
      currentStreak = 1;
    } else {
      const diff = dayDiff(previousDate, localDate);
      if (diff === 1) {
        currentStreak += 1;
      } else if (diff > 1) {
        currentStreak = 1;
      }
    }

    previousDate = localDate;

    const baseTier = streakToTier(currentStreak);
    let tier = baseTier;
    let t3Maintained = false;
    let t3GraceUsed = false;

    if (baseTier === CompetitionTier.T3) {
      let daysWithTwo = 0;
      let daysWithLow = 0;
      for (let index = 0; index < 7; index += 1) {
        const date = plusDays(localDate, -index);
        const value = getRawCount(byDate, date);
        if (value <= 1) {
          daysWithLow += 1;
        }
        if (value === 2) {
          daysWithTwo += 1;
        }
      }

      t3Maintained = daysWithLow === 0 && daysWithTwo <= 1;
      t3GraceUsed = t3Maintained && daysWithTwo === 1;
      if (!t3Maintained) {
        tier = CompetitionTier.T2;
      }
    }

    let bonusPercent = 0;
    const activeMultipliers: string[] = [];

    if (tier === CompetitionTier.T1) {
      if (rawCheckIns >= 3) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M1_3_CHECKINS', 20);
      } else if (rawCheckIns >= 2) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M1_2_CHECKINS', 10);
      }
      if (currentStreak >= 3 && currentStreak <= 4) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M2_STREAK_3_4', 10);
      }
      if (journalEntries > 0) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M3_JOURNAL', 10);
      }
      if (rawCheckIns >= 2 && getRawCount(byDate, plusDays(localDate, -1)) >= 2) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M4_TWO_DAYS_2PLUS', 10);
      }
    }

    if (tier === CompetitionTier.T2) {
      if (currentStreak >= 10) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M5_STREAK_10_14', 25);
      } else if (currentStreak >= 5) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M5_STREAK_5_9', 15);
      }
      if (rawCheckIns >= 3) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M6_3_CHECKINS', 25);
      }
      if (countLastNDaysAtLeast(byDate, localDate, 7, 2) >= 5) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M7_5_OF_7_DAYS_2PLUS', 20);
      }
    }

    if (tier === CompetitionTier.T3) {
      if (t3Maintained) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M8_T3_MAINTAINED', 35);
      }
      if (currentStreak >= 14) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M9_STREAK_14', 25);
      }
      if (allLastNDaysAtLeast(byDate, localDate, 7, 2)) {
        bonusPercent = applyBonus(activeMultipliers, bonusPercent, 'M10_ALL_7_DAYS_2PLUS', 30);
      }
    }

    const creditedCheckIns = Math.min(rawCheckIns, MAX_CREDITED_CHECKINS);
    const basePoints = creditedCheckIns * BASE_POINTS_PER_ENTRY;
    const cappedBonus = Math.min(bonusPercent, tierCapPercent(tier));
    const finalPoints = Math.round(basePoints * (1 + cappedBonus / 100));

    rows.push({
      userId,
      localDate,
      rawCheckIns,
      creditedCheckIns,
      journalEntries,
      streak: currentStreak,
      tier,
      t3Maintained,
      t3GraceUsed,
      bonusPercent: cappedBonus,
      basePoints,
      finalPoints,
      activeMultipliers
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.competitionDailyStat.deleteMany({ where: { userId } });

    if (rows.length > 0) {
      await tx.competitionDailyStat.createMany({
        data: rows.map((row) => ({
          userId: row.userId,
          localDate: row.localDate,
          rawCheckIns: row.rawCheckIns,
          creditedCheckIns: row.creditedCheckIns,
          journalEntries: row.journalEntries,
          streak: row.streak,
          tier: row.tier,
          t3Maintained: row.t3Maintained,
          t3GraceUsed: row.t3GraceUsed,
          bonusPercent: row.bonusPercent,
          basePoints: row.basePoints,
          finalPoints: row.finalPoints,
          activeMultipliers: row.activeMultipliers
        }))
      });
    }
  });

  const persistedRows = await prisma.competitionDailyStat.findMany({
    where: { userId },
    orderBy: { localDate: 'asc' }
  });

  await awardBadgesForUser(userId, persistedRows);
  await markLeaderboardSnapshotsStale();

  return persistedRows;
}

function computePeriodMaxStreak(dates: string[]): number {
  if (dates.length === 0) {
    return 0;
  }

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let best = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    if (dayDiff(sorted[index - 1], sorted[index]) === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function resolveClosestRivals(params: {
  rows: CompetitionLeaderboardRow[];
  userId?: string;
  metric: CompetitionMetric;
}): { closestRivals: CompetitionLeaderboardRow[]; promotionHint: string } {
  const { rows, userId, metric } = params;
  if (!userId || rows.length === 0) {
    return {
      closestRivals: rows.slice(0, Math.min(5, rows.length)),
      promotionHint: 'Zrob dzis check-in, aby utrzymac miejsce.'
    };
  }

  const meIndex = rows.findIndex((row) => row.userId === userId);
  if (meIndex === -1) {
    return {
      closestRivals: rows.slice(0, Math.min(5, rows.length)),
      promotionHint: 'Pierwszy check-in dnia wlaczy Cie do najblizszej rywalizacji.'
    };
  }

  const start = Math.max(0, meIndex - 2);
  const end = Math.min(rows.length, meIndex + 3);
  const closestRivals = rows.slice(start, end);

  const me = rows[meIndex]!;
  const above = meIndex > 0 ? rows[meIndex - 1] : null;

  if (!above) {
    return {
      closestRivals,
      promotionHint: 'Jestes na prowadzeniu. Domknij 2/2, by utrzymac przewage.'
    };
  }

  if (metric === 'maxStreak') {
    const gap = Math.max(1, above.maxStreak - me.maxStreak + 1);
    return {
      closestRivals,
      promotionHint: `Brakuje ${gap} dni serii, aby awansowac o 1 miejsce.`
    };
  }

  if (metric === 'totalCheckIns') {
    const gap = Math.max(1, above.totalCheckIns - me.totalCheckIns + 1);
    return {
      closestRivals,
      promotionHint: `Brakuje ${gap} check-inow, aby awansowac o 1 miejsce.`
    };
  }

  const gap = Math.max(1, above.score - me.score + 1);
  return {
    closestRivals,
    promotionHint: `Brakuje ${gap} pkt, aby awansowac o 1 miejsce.`
  };
}

async function buildLeaderboardRows(metric: CompetitionMetric, period: CompetitionPeriod): Promise<CompetitionLeaderboardRow[]> {
  const range = getRangeForPeriod(period);

  const rows = await prisma.competitionDailyStat.findMany({
    where: range
      ? {
          localDate: {
            gte: range.from,
            lte: range.to
          }
        }
      : undefined,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          avatarSeed: true
        }
      }
    },
    orderBy: [{ localDate: 'asc' }]
  });

  const aggregateMap = new Map<string, LeaderboardAggregate>();

  for (const row of rows) {
    const current =
      aggregateMap.get(row.userId) ??
      ({
        userId: row.userId,
        displayName: row.user.displayName ?? `Uzytkownik-${row.userId.slice(-6)}`,
        avatarUrl: row.user.avatarUrl,
        avatarSeed: row.user.avatarSeed,
        score: 0,
        totalCheckIns: 0,
        latestLocalDate: row.localDate,
        dates: []
      } satisfies LeaderboardAggregate);

    current.score += row.finalPoints;
    current.totalCheckIns += row.rawCheckIns;
    current.latestLocalDate = current.latestLocalDate > row.localDate ? current.latestLocalDate : row.localDate;
    current.dates.push(row.localDate);

    aggregateMap.set(row.userId, current);
  }

  const result = Array.from(aggregateMap.values()).map((item) => ({
    userId: item.userId,
    displayName: item.displayName,
    avatarUrl: item.avatarUrl,
    avatarSeed: item.avatarSeed,
    score: item.score,
    maxStreak: computePeriodMaxStreak(item.dates),
    totalCheckIns: item.totalCheckIns,
    latestLocalDate: item.latestLocalDate
  }));

  const tieBreak = (
    a: Omit<CompetitionLeaderboardRow, 'rank'>,
    b: Omit<CompetitionLeaderboardRow, 'rank'>
  ) => {
    const byStreak = b.maxStreak - a.maxStreak;
    if (byStreak !== 0) {
      return byStreak;
    }
    const byLatest = a.latestLocalDate.localeCompare(b.latestLocalDate);
    if (byLatest !== 0) {
      return byLatest;
    }
    return a.userId.localeCompare(b.userId);
  };

  result.sort((a, b) => {
    if (metric === 'maxStreak') {
      const byMetric = b.maxStreak - a.maxStreak;
      if (byMetric !== 0) {
        return byMetric;
      }
      const byScore = b.score - a.score;
      if (byScore !== 0) {
        return byScore;
      }
      const byLatest = a.latestLocalDate.localeCompare(b.latestLocalDate);
      if (byLatest !== 0) {
        return byLatest;
      }
      return a.userId.localeCompare(b.userId);
    }

    if (metric === 'totalCheckIns') {
      const byMetric = b.totalCheckIns - a.totalCheckIns;
      if (byMetric !== 0) {
        return byMetric;
      }
      const byScore = b.score - a.score;
      if (byScore !== 0) {
        return byScore;
      }
      const byLatest = a.latestLocalDate.localeCompare(b.latestLocalDate);
      if (byLatest !== 0) {
        return byLatest;
      }
      return a.userId.localeCompare(b.userId);
    }

    const byMetric = b.score - a.score;
    if (byMetric !== 0) {
      return byMetric;
    }
    return tieBreak(a, b);
  });

  return result.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

export async function getLeaderboard(params: {
  metric: CompetitionMetric;
  period: CompetitionPeriod;
  limit?: number;
  userId?: string;
}): Promise<CompetitionLeaderboardPayload> {
  const metric = params.metric;
  const period = params.period;
  const limit = sanitizeLimit(params.limit ?? 100);
  const metricEnum = toMetricEnum(metric);

  const snapshot = await prisma.leaderboardSnapshot.findUnique({
    where: {
      metric_periodKey: {
        metric: metricEnum,
        periodKey: period
      }
    }
  });

  const now = new Date();
  const isFresh = snapshot && now.getTime() - snapshot.generatedAt.getTime() < SNAPSHOT_TTL_MS;

  if (snapshot && isFresh) {
    const payload = snapshot.payload as { rows?: CompetitionLeaderboardRow[]; generatedAt?: string };
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const closest = resolveClosestRivals({
      rows,
      userId: params.userId,
      metric
    });

    return {
      metric: fromMetricEnum(snapshot.metric),
      period: period,
      generatedAt: payload.generatedAt ?? snapshot.generatedAt.toISOString(),
      rows: rows.slice(0, limit),
      closestRivals: closest.closestRivals,
      promotionHint: closest.promotionHint
    };
  }

  const fullRows = await buildLeaderboardRows(metric, period);
  const nextPayload: CompetitionLeaderboardPayload = {
    metric,
    period,
    generatedAt: now.toISOString(),
    rows: fullRows
  };

  await prisma.leaderboardSnapshot.upsert({
    where: {
      metric_periodKey: {
        metric: metricEnum,
        periodKey: period
      }
    },
    create: {
      metric: metricEnum,
      periodKey: period,
      generatedAt: now,
      payload: nextPayload,
      stale: false
    },
    update: {
      generatedAt: now,
      payload: nextPayload,
      stale: false
    }
  });

  const closest = resolveClosestRivals({
    rows: nextPayload.rows,
    userId: params.userId,
    metric
  });

  return {
    ...nextPayload,
    rows: nextPayload.rows.slice(0, limit),
    closestRivals: closest.closestRivals,
    promotionHint: closest.promotionHint
  };
}

export async function getCompetitionMe(params: {
  userId: string;
  metric: CompetitionMetric;
  period: CompetitionPeriod;
}) {
  const { userId, metric, period } = params;
  const leaderboardRows = await buildLeaderboardRows(metric, period);
  const currentRow = leaderboardRows.find((row) => row.userId === userId) ?? null;

  const latest = await prisma.competitionDailyStat.findFirst({
    where: { userId },
    orderBy: { localDate: 'desc' }
  });

  const activeMultipliers =
    latest && Array.isArray(latest.activeMultipliers)
      ? latest.activeMultipliers.filter((item): item is string => typeof item === 'string')
      : [];

  let nextTier: CompetitionTierUi | null = 'T2';
  let progressCurrent = Math.min(latest?.streak ?? 0, 4);
  let progressTarget = 5;
  let tierRule = 'Buduj serię przez codzienne wpisy.';

  if (latest?.tier === CompetitionTier.T2) {
    nextTier = 'T3';
    progressCurrent = Math.max(0, (latest.streak ?? 5) - 4);
    progressTarget = 11;
    tierRule = 'Do T3 wchodzisz od 15 dni serii.';
  }

  if (latest?.tier === CompetitionTier.T3) {
    nextTier = null;
    progressCurrent = latest.t3Maintained ? 7 : 0;
    progressTarget = 7;
    tierRule = 'Utrzymuj 3 check-iny dziennie. Jeden dzień z 2 wpisami jest dozwolony raz na 7 dni.';
  }

  return {
    metric,
    period,
    rank: currentRow?.rank ?? null,
    score: currentRow?.score ?? 0,
    maxStreak: currentRow?.maxStreak ?? 0,
    totalCheckIns: currentRow?.totalCheckIns ?? 0,
    tier: latest ? tierToUi(latest.tier) : ('T1' as CompetitionTierUi),
    activeMultipliers,
    progress: {
      nextTier,
      current: progressCurrent,
      target: progressTarget,
      rule: tierRule
    },
    generatedAt: new Date().toISOString()
  };
}

export async function getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  const [rows, awards] = await Promise.all([
    prisma.competitionDailyStat.findMany({
      where: { userId },
      orderBy: { localDate: 'asc' }
    }),
    prisma.badgeAward.findMany({ where: { userId } })
  ]);

  const metrics = calculateBadgeMetrics(rows);
  const awardsByBadge = new Map<BadgeType, BadgeAward>(awards.map((award) => [award.badge, award]));

  return BADGE_DEFINITIONS.map((definition) => {
    const progress = definition.current(metrics);
    const award = awardsByBadge.get(definition.badge);

    return {
      badge: definition.badge,
      title: definition.title,
      description: definition.description,
      earned: Boolean(award),
      awardedAt: award ? award.awardedAt.toISOString() : null,
      progress: Math.min(progress, definition.target),
      target: definition.target
    };
  });
}

export async function updateCompetitionAfterCheckIn(userId: string) {
  await recomputeUserCompetitionStats(userId);
}

export async function backfillCompetitionStats() {
  const displayNameResult = await ensureDisplayNames();
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    await recomputeUserCompetitionStats(user.id);
  }

  return {
    usersProcessed: users.length,
    usersPatchedWithDisplayName: displayNameResult.patchedUsers
  };
}

export function normalizeProfileName(value: string) {
  return normalizeDisplayName(value);
}
