import { BadgeType } from '@prisma/client';

import { dayDiff, formatLocalDate, parseLocalDate } from '@/lib/date';
import { prisma } from '@/lib/prisma';

const XP_PER_CHECKIN = 10;
const XP_BONUS_THIRD_ENTRY = 15;
const XP_STREAK_7 = 30;

export function levelFromXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 100) + 1);
}

export function deriveStreak(params: {
  lastLocalDate: string | null;
  currentLocalDate: string;
  currentStreak: number;
}) {
  const { lastLocalDate, currentLocalDate, currentStreak } = params;
  if (!lastLocalDate) {
    return 1;
  }
  const diff = dayDiff(lastLocalDate, currentLocalDate);
  if (diff === 0) {
    return currentStreak;
  }
  if (diff === 1) {
    return currentStreak + 1;
  }
  return 1;
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

export async function updateGamificationAfterCheckIn(params: {
  userId: string;
  localDate: string;
  createdAt: Date;
  userTimeZone: string;
}) {
  const { userId, localDate, createdAt, userTimeZone } = params;

  const [state, entriesToday] = await Promise.all([
    prisma.gamificationState.findUnique({ where: { userId } }),
    prisma.checkIn.count({ where: { userId, localDate } })
  ]);

  if (!state) {
    throw new Error('Gamification state is missing');
  }

  let currentStreak = state.currentStreak;
  let bestStreak = state.bestStreak;
  let totalXp = state.totalXp;

  const lastLocalDate = state.lastCheckInAt ? formatLocalDate(state.lastCheckInAt, userTimeZone) : null;
  currentStreak = deriveStreak({
    lastLocalDate,
    currentLocalDate: localDate,
    currentStreak: state.currentStreak
  });

  bestStreak = Math.max(bestStreak, currentStreak);

  totalXp += XP_PER_CHECKIN;
  if (entriesToday === 3) {
    totalXp += XP_BONUS_THIRD_ENTRY;
    await ensureBadge(userId, BadgeType.THREE_ENTRIES_ONE_DAY);
  }

  const totalCheckIns = state.totalCheckIns + 1;

  if (totalCheckIns >= 1) {
    await ensureBadge(userId, BadgeType.FIRST_CHECKIN);
  }
  if (totalCheckIns >= 30) {
    await ensureBadge(userId, BadgeType.CHECKINS_30);
  }
  if (currentStreak >= 7) {
    const existed = await prisma.badgeAward.findUnique({
      where: {
        userId_badge: {
          userId,
          badge: BadgeType.STREAK_7
        }
      }
    });
    if (!existed) {
      totalXp += XP_STREAK_7;
    }
    await ensureBadge(userId, BadgeType.STREAK_7);
  }

  const level = levelFromXp(totalXp);

  await prisma.gamificationState.update({
    where: { userId },
    data: {
      currentStreak,
      bestStreak,
      totalCheckIns,
      totalXp,
      level,
      lastCheckInAt: parseLocalDate(localDate) > createdAt ? parseLocalDate(localDate) : createdAt
    }
  });
}

export async function getGamificationStatus(userId: string) {
  const [state, badges, checkInStats] = await Promise.all([
    prisma.gamificationState.findUnique({ where: { userId } }),
    prisma.badgeAward.findMany({ where: { userId }, orderBy: { awardedAt: 'desc' } }),
    prisma.checkIn.aggregate({
      where: { userId },
      _count: true,
      _min: { createdAt: true },
      _max: { createdAt: true }
    })
  ]);

  if (!state) {
    throw new Error('Gamification state is missing');
  }

  let avgPerDay = 0;
  if (checkInStats._count > 0 && checkInStats._min.createdAt && checkInStats._max.createdAt) {
    const spanMs = checkInStats._max.createdAt.getTime() - checkInStats._min.createdAt.getTime();
    const days = Math.max(1, Math.ceil(spanMs / 86_400_000) + 1);
    avgPerDay = Number((checkInStats._count / days).toFixed(2));
  }

  return {
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    totalCheckIns: state.totalCheckIns,
    totalXp: state.totalXp,
    level: state.level,
    avgEntriesPerDay: avgPerDay,
    badges: badges.map((b) => ({ badge: b.badge, awardedAt: b.awardedAt }))
  };
}
