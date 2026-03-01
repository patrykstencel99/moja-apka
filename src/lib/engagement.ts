import { PushDispatchStatus, SocialPressureMode, type User } from '@prisma/client';

import { dayDiff, formatLocalDate, plusDays } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import type { EngagementSlotDto, EngagementTodayDto } from '@/types/fun';

export const SLOT1_XP = 10;
export const SLOT2_XP = 25;
export const MAX_PUSH_PER_DAY = 2;
export const PUSH_COOLDOWN_HOURS = 4;

const QUIET_HOURS_START_HOUR = 21;
const QUIET_HOURS_START_MINUTE = 30;
const QUIET_HOURS_END_HOUR = 7;
const QUIET_HOURS_END_MINUTE = 30;
const PRESSURE_COOLDOWN_HOURS = 72;
const COMEBACK_GAP_DAYS = 2;
const COMEBACK_BONUS_COMBO_BPS = 10;
const COMBO_MAX_BPS = 200;
const PUSH_RETRY_DELAY_MINUTES = 10;

export type ReminderType = 'SLOT_REMINDER' | 'COMEBACK';

export type ReminderCandidate = {
  userId: string;
  localDate: string;
  timezone: string;
  reminderType: ReminderType;
  missingSlot: EngagementSlotDto | null;
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
  };
};

export type EngagementCheckInResult = {
  slot: EngagementSlotDto;
  slot1Done: boolean;
  slot2Done: boolean;
  perfectDay: boolean;
  perfectDayJustUnlocked: boolean;
  rescueQuestActive: boolean;
  rescueCompletedNow: boolean;
  comebackGapDays: number | null;
  xpDelta: number;
};

function clampHour(value: number) {
  if (!Number.isFinite(value)) {
    return 20;
  }
  const hour = Math.trunc(value);
  return Math.max(0, Math.min(23, hour));
}

function localTimeParts(date: Date, timezone: string): { localDate: string; hour: number; minute: number } {
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const [hoursRaw, minutesRaw] = timeFmt.format(date).split(':');
  const hour = Number(hoursRaw ?? '0');
  const minute = Number(minutesRaw ?? '0');

  return {
    localDate: dateFmt.format(date),
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0
  };
}

function parseLocalDate(localDate: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = localDate.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function parseOffsetMinutes(value: string): number | null {
  const normalized = value.trim();
  if (normalized === 'GMT' || normalized === 'UTC') {
    return 0;
  }

  const match = normalized.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return sign * (hours * 60 + minutes);
}

function resolveTimeZoneOffsetMinutes(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const part = fmt.formatToParts(date).find((entry) => entry.type === 'timeZoneName');
  const parsed = parseOffsetMinutes(part?.value ?? 'GMT');
  return parsed ?? 0;
}

function resolveUtcDateForLocalTime(params: {
  localDate: string;
  hour: number;
  minute: number;
  timezone: string;
}): Date | null {
  const parsed = parseLocalDate(params.localDate);
  if (!parsed) {
    return null;
  }

  let utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, params.hour, params.minute, 0, 0);

  // Resolve DST transitions by re-evaluating offset after first conversion.
  for (let i = 0; i < 2; i += 1) {
    const offsetMinutes = resolveTimeZoneOffsetMinutes(new Date(utcMs), params.timezone);
    utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, params.hour, params.minute, 0, 0) - offsetMinutes * 60 * 1000;
  }

  return new Date(utcMs);
}

export function resolveCheckInSlot(params: {
  timestamp: Date;
  timezone: string;
  slot2HourLocal: number;
}): EngagementSlotDto {
  const local = localTimeParts(params.timestamp, params.timezone);
  const slot2Hour = clampHour(params.slot2HourLocal);

  return local.hour >= slot2Hour ? 'SLOT_2' : 'SLOT_1';
}

export function isWithinQuietHours(hour: number, minute: number): boolean {
  const minutesOfDay = hour * 60 + minute;
  const quietStart = QUIET_HOURS_START_HOUR * 60 + QUIET_HOURS_START_MINUTE;
  const quietEnd = QUIET_HOURS_END_HOUR * 60 + QUIET_HOURS_END_MINUTE;

  return minutesOfDay >= quietStart || minutesOfDay < quietEnd;
}

export function hasPushCooldown(lastPushAt: Date | null, now: Date): boolean {
  if (!lastPushAt) {
    return false;
  }

  return now.getTime() - lastPushAt.getTime() < PUSH_COOLDOWN_HOURS * 60 * 60 * 1000;
}

function resolveMissingSlot(slot1Done: boolean, slot2Done: boolean): EngagementSlotDto | null {
  if (!slot1Done) {
    return 'SLOT_1';
  }
  if (!slot2Done) {
    return 'SLOT_2';
  }
  return null;
}

export function xpForSlot(slot: EngagementSlotDto): number {
  return slot === 'SLOT_1' ? SLOT1_XP : SLOT2_XP;
}

export function shouldDowngradePressure(recentPerfectDayFlags: boolean[]): boolean {
  if (recentPerfectDayFlags.length < 3) {
    return false;
  }

  return recentPerfectDayFlags.slice(0, 3).every((value) => value === false);
}

export function shouldRestoreStrongPressure(recentPerfectDayFlags: boolean[]): boolean {
  if (recentPerfectDayFlags.length < 2) {
    return false;
  }

  return recentPerfectDayFlags[0] === true && recentPerfectDayFlags[1] === true;
}

export async function upsertEngagementAfterCheckIn(params: {
  userId: string;
  localDate: string;
  createdAt: Date;
  timezone: string;
  slot2HourLocal: number;
}): Promise<EngagementCheckInResult> {
  const slot = resolveCheckInSlot({
    timestamp: params.createdAt,
    timezone: params.timezone,
    slot2HourLocal: params.slot2HourLocal
  });

  return prisma.$transaction(async (tx) => {
    const previousCheckIn = await tx.checkIn.findFirst({
      where: {
        userId: params.userId,
        localDate: {
          lt: params.localDate
        }
      },
      orderBy: {
        localDate: 'desc'
      },
      select: {
        localDate: true
      }
    });

    const comebackGapDays = previousCheckIn ? dayDiff(previousCheckIn.localDate, params.localDate) : null;
    const comebackTriggered = Boolean(comebackGapDays && comebackGapDays >= COMEBACK_GAP_DAYS);

    const existing = await tx.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: params.userId,
          localDate: params.localDate
        }
      }
    });

    const slot1AlreadyDone = existing?.slot1Done ?? false;
    const slot2AlreadyDone = existing?.slot2Done ?? false;

    const slotJustCompleted = slot === 'SLOT_1' ? !slot1AlreadyDone : !slot2AlreadyDone;

    const nextSlot1Done = slot === 'SLOT_1' ? true : slot1AlreadyDone;
    const nextSlot2Done = slot === 'SLOT_2' ? true : slot2AlreadyDone;
    const perfectDay = nextSlot1Done && nextSlot2Done;
    const perfectDayJustUnlocked = perfectDay && !(existing?.perfectDay ?? false);
    const rescueAlreadyCompleted = Boolean(existing?.rescueCompletedAt);
    const rescueQuestWasActive = !rescueAlreadyCompleted && ((existing?.rescueQuestActive ?? false) || comebackTriggered);
    const rescueCompletedNow = rescueQuestWasActive && slotJustCompleted && !existing?.rescueCompletedAt;

    const nextData = {
      slot1Done: nextSlot1Done,
      slot2Done: nextSlot2Done,
      slot1CompletedAt: slot === 'SLOT_1' && !slot1AlreadyDone ? params.createdAt : (existing?.slot1CompletedAt ?? null),
      slot2CompletedAt: slot === 'SLOT_2' && !slot2AlreadyDone ? params.createdAt : (existing?.slot2CompletedAt ?? null),
      perfectDay,
      comebackEligible: comebackTriggered && !rescueCompletedNow,
      rescueQuestActive: rescueQuestWasActive && !rescueCompletedNow,
      rescueCompletedAt: rescueCompletedNow ? params.createdAt : (existing?.rescueCompletedAt ?? null),
      rescueBonusGranted: rescueCompletedNow ? false : (existing?.rescueBonusGranted ?? false),
      comebackGapDays: comebackTriggered ? (comebackGapDays ?? null) : (existing?.comebackGapDays ?? null)
    };

    if (!existing) {
      await tx.engagementDailyState.create({
        data: {
          userId: params.userId,
          localDate: params.localDate,
          ...nextData
        }
      });
    } else {
      await tx.engagementDailyState.update({
        where: { id: existing.id },
        data: nextData
      });
    }

    const xpDelta = slotJustCompleted ? xpForSlot(slot) : 0;

    return {
      slot,
      slot1Done: nextSlot1Done,
      slot2Done: nextSlot2Done,
      perfectDay,
      perfectDayJustUnlocked,
      rescueQuestActive: nextData.rescueQuestActive,
      rescueCompletedNow,
      comebackGapDays: nextData.comebackGapDays,
      xpDelta
    };
  });
}

export async function applyComebackBonus(params: { userId: string; localDate: string }) {
  return prisma.$transaction(async (tx) => {
    const state = await tx.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: params.userId,
          localDate: params.localDate
        }
      }
    });

    if (!state?.rescueCompletedAt || state.rescueBonusGranted) {
      return {
        bonusApplied: false,
        comboDelta: 0
      };
    }

    const gamification = await tx.gamificationState.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId },
      update: {}
    });

    const nextComboBps = Math.min(COMBO_MAX_BPS, gamification.comboBps + COMEBACK_BONUS_COMBO_BPS);
    const comboDelta = Math.max(0, nextComboBps - gamification.comboBps);

    if (comboDelta > 0) {
      await tx.gamificationState.update({
        where: { userId: params.userId },
        data: {
          comboBps: nextComboBps
        }
      });
    }

    await tx.engagementDailyState.update({
      where: { id: state.id },
      data: {
        rescueBonusGranted: true,
        rescueQuestActive: false,
        comebackEligible: false
      }
    });

    return {
      bonusApplied: true,
      comboDelta
    };
  });
}

async function countPerfectDays(userId: string, from: string, to: string) {
  return prisma.engagementDailyState.count({
    where: {
      userId,
      localDate: {
        gte: from,
        lte: to
      },
      perfectDay: true
    }
  });
}

function rankByScore(rows: Array<{ userId: string; score: number }>, targetUserId: string): { rank: number | null; score: number } {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.userId.localeCompare(b.userId);
  });

  const index = sorted.findIndex((row) => row.userId === targetUserId);
  if (index === -1) {
    return { rank: null, score: 0 };
  }

  return {
    rank: index + 1,
    score: sorted[index]?.score ?? 0
  };
}

async function loadScoreboardUntil(localDateInclusive: string): Promise<Array<{ userId: string; score: number }>> {
  const grouped = await prisma.competitionDailyStat.groupBy({
    by: ['userId'],
    where: {
      localDate: {
        lte: localDateInclusive
      }
    },
    _sum: {
      finalPoints: true
    }
  });

  return grouped.map((row) => ({
    userId: row.userId,
    score: row._sum.finalPoints ?? 0
  }));
}

async function buildRankSignals(userId: string, localDate: string) {
  const previousDate = plusDays(localDate, -1);
  const [todayRows, previousRows] = await Promise.all([loadScoreboardUntil(localDate), loadScoreboardUntil(previousDate)]);

  const current = rankByScore(todayRows, userId);
  const previous = rankByScore(previousRows, userId);

  const currentSorted = [...todayRows].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.userId.localeCompare(b.userId);
  });

  const currentIndex = currentSorted.findIndex((row) => row.userId === userId);
  const below = currentIndex >= 0 ? currentSorted[currentIndex + 1] : null;
  const mine = currentIndex >= 0 ? currentSorted[currentIndex] : null;

  return {
    rankDeltaToday: current.rank && previous.rank ? previous.rank - current.rank : 0,
    riskOfDrop: mine && below ? Math.max(0, mine.score - below.score) : 0
  };
}

async function resolveAdaptivePressure(params: { user: User; localDate: string }): Promise<SocialPressureMode> {
  const { user, localDate } = params;
  const now = new Date();

  const recent = await prisma.engagementDailyState.findMany({
    where: {
      userId: user.id,
      localDate: {
        lte: localDate
      }
    },
    orderBy: {
      localDate: 'desc'
    },
    take: 3
  });

  const recentPerfect = recent.map((entry) => entry.perfectDay);
  const restoreStrong = shouldRestoreStrongPressure(recentPerfect);

  if (restoreStrong && user.socialPressureMode === SocialPressureMode.SOFT) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        socialPressureMode: SocialPressureMode.STRONG,
        socialPressureCooldownUntil: null
      }
    });
    return SocialPressureMode.STRONG;
  }

  if (user.socialPressureCooldownUntil && user.socialPressureCooldownUntil > now) {
    return SocialPressureMode.SOFT;
  }

  const failedThreeInRow = shouldDowngradePressure(recentPerfect);

  if (failedThreeInRow && user.socialPressureMode !== SocialPressureMode.SOFT) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        socialPressureMode: SocialPressureMode.SOFT,
        socialPressureCooldownUntil: new Date(now.getTime() + PRESSURE_COOLDOWN_HOURS * 60 * 60 * 1000)
      }
    });
    return SocialPressureMode.SOFT;
  }

  return user.socialPressureMode;
}

function resolveNextReminderAt(params: {
  missingSlot: EngagementSlotDto | null;
  localDate: string;
  user: User;
  now: Date;
}): string | null {
  if (!params.missingSlot) {
    return null;
  }

  const targetHour = params.missingSlot === 'SLOT_1' ? clampHour(params.user.slot1HourLocal) : clampHour(params.user.slot2HourLocal);
  const target = resolveUtcDateForLocalTime({
    localDate: params.localDate,
    hour: targetHour,
    minute: 0,
    timezone: params.user.timezone
  });

  if (!target || !Number.isFinite(target.getTime()) || target <= params.now) {
    return new Date(params.now.getTime() + PUSH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  }

  return target.toISOString();
}

export async function getEngagementTodayState(params: { user: User; localDate: string }): Promise<EngagementTodayDto> {
  const { user, localDate } = params;

  const state =
    (await prisma.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: user.id,
          localDate
        }
      }
    })) ??
    (await prisma.engagementDailyState.create({
      data: {
        userId: user.id,
        localDate,
        comebackEligible: false
      }
    }));

  const [perfectDays7d, perfectDays30d, rankSignals, pressureMode] = await Promise.all([
    countPerfectDays(user.id, plusDays(localDate, -6), localDate),
    countPerfectDays(user.id, plusDays(localDate, -29), localDate),
    buildRankSignals(user.id, localDate),
    resolveAdaptivePressure({ user, localDate })
  ]);

  const lastCompletedSlot: EngagementSlotDto | null = state.slot2Done ? 'SLOT_2' : state.slot1Done ? 'SLOT_1' : null;
  const missingSlot = resolveMissingSlot(state.slot1Done, state.slot2Done);

  return {
    slot1Done: state.slot1Done,
    slot2Done: state.slot2Done,
    perfectDay: state.perfectDay,
    perfectDays7d,
    perfectDays30d,
    rescueQuestActive: state.rescueQuestActive,
    rescueCompletedToday: Boolean(state.rescueCompletedAt),
    comebackGapDays: state.comebackGapDays ?? null,
    lastCompletedSlot,
    xpAwardedToday: (state.slot1Done ? SLOT1_XP : 0) + (state.slot2Done ? SLOT2_XP : 0),
    nextReminderAt: resolveNextReminderAt({
      missingSlot,
      localDate,
      user,
      now: new Date()
    }),
    rankDeltaToday: rankSignals.rankDeltaToday,
    riskOfDrop: rankSignals.riskOfDrop,
    socialPressureMode: pressureMode
  };
}

export async function listReminderCandidates(now: Date, limit = 200): Promise<ReminderCandidate[]> {
  const users = await prisma.user.findMany({
    where: {
      notificationsEnabled: true,
      pushSubscriptions: {
        some: {
          revokedAt: null
        }
      }
    },
    take: Math.max(1, Math.min(limit, 500)),
    include: {
      pushSubscriptions: {
        where: {
          revokedAt: null
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  });

  const candidates: ReminderCandidate[] = [];

  for (const user of users) {
    const subscription = user.pushSubscriptions[0];
    if (!subscription) {
      continue;
    }

    const local = localTimeParts(now, user.timezone);
    if (isWithinQuietHours(local.hour, local.minute)) {
      continue;
    }

    const state = await prisma.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: user.id,
          localDate: local.localDate
        }
      }
    });

    const slot1Done = state?.slot1Done ?? false;
    const slot2Done = state?.slot2Done ?? false;
    const missingSlot = resolveMissingSlot(slot1Done, slot2Done);

    if (!missingSlot) {
      continue;
    }

    const pushCount = state?.pushCount ?? 0;
    if (pushCount >= MAX_PUSH_PER_DAY) {
      continue;
    }

    if (hasPushCooldown(state?.lastPushAt ?? null, now)) {
      continue;
    }

    const latestCheckIn = await prisma.checkIn.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true
      }
    });

    const staleMs = latestCheckIn ? now.getTime() - latestCheckIn.createdAt.getTime() : Number.POSITIVE_INFINITY;
    const reminderType: ReminderType = staleMs >= 24 * 60 * 60 * 1000 ? 'COMEBACK' : 'SLOT_REMINDER';

    if (reminderType === 'COMEBACK' && pushCount >= MAX_PUSH_PER_DAY + 1) {
      continue;
    }

    candidates.push({
      userId: user.id,
      localDate: local.localDate,
      timezone: user.timezone,
      reminderType,
      missingSlot,
      subscription: {
        id: subscription.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: subscription.userAgent
      }
    });
  }

  return candidates;
}

export async function createReminderDispatch(params: {
  userId: string;
  subscriptionId: string;
  localDate: string;
  reminderType: ReminderType;
  payload: { title: string; body: string; url: string };
}) {
  const existing = await prisma.pushDispatch.findFirst({
    where: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      localDate: params.localDate,
      reminderType: params.reminderType,
      status: {
        in: [PushDispatchStatus.PENDING, PushDispatchStatus.RETRY_PENDING]
      }
    },
    select: {
      id: true
    }
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.pushDispatch.create({
    data: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      localDate: params.localDate,
      reminderType: params.reminderType,
      payload: params.payload
    },
    select: {
      id: true
    }
  });

  return created.id;
}

export async function listDueReminderDispatches(now: Date, limit = 200) {
  return prisma.pushDispatch.findMany({
    where: {
      status: {
        in: [PushDispatchStatus.PENDING, PushDispatchStatus.RETRY_PENDING]
      },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
    },
    include: {
      subscription: true
    },
    orderBy: [{ createdAt: 'asc' }],
    take: Math.max(1, Math.min(limit, 500))
  });
}

export async function markDispatchDelivered(dispatchId: string, deliveredAt: Date) {
  await prisma.pushDispatch.update({
    where: { id: dispatchId },
    data: {
      status: PushDispatchStatus.DELIVERED,
      deliveredAt,
      nextAttemptAt: null,
      lastError: null
    }
  });
}

export async function markDispatchFailed(params: {
  dispatchId: string;
  attemptedAt: Date;
  attemptCount: number;
  error: string;
  temporary: boolean;
}) {
  const isRetryAvailable = params.temporary && params.attemptCount < 1;

  await prisma.pushDispatch.update({
    where: { id: params.dispatchId },
    data: {
      status: isRetryAvailable ? PushDispatchStatus.RETRY_PENDING : PushDispatchStatus.FAILED,
      attemptCount: {
        increment: 1
      },
      nextAttemptAt: isRetryAvailable ? new Date(params.attemptedAt.getTime() + PUSH_RETRY_DELAY_MINUTES * 60 * 1000) : null,
      lastError: params.error
    }
  });

  return {
    scheduledRetry: isRetryAvailable
  };
}

export async function markReminderSent(params: {
  userId: string;
  localDate: string;
  sentAt: Date;
}) {
  await prisma.engagementDailyState.upsert({
    where: {
      userId_localDate: {
        userId: params.userId,
        localDate: params.localDate
      }
    },
    create: {
      userId: params.userId,
      localDate: params.localDate,
      pushCount: 1,
      lastPushAt: params.sentAt,
      comebackEligible: false
    },
    update: {
      pushCount: {
        increment: 1
      },
      lastPushAt: params.sentAt
    }
  });
}

export async function markSubscriptionFailure(subscriptionId: string, failedAt: Date) {
  const updated = await prisma.pushSubscription.update({
    where: { id: subscriptionId },
    data: {
      failCount: {
        increment: 1
      },
      lastUsedAt: failedAt
    },
    select: {
      id: true,
      failCount: true
    }
  });

  if (updated.failCount >= 3) {
    await prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: {
        revokedAt: failedAt
      }
    });
  }
}

export async function markSubscriptionSuccess(subscriptionId: string, usedAt: Date) {
  await prisma.pushSubscription.update({
    where: { id: subscriptionId },
    data: {
      failCount: 0,
      lastUsedAt: usedAt
    }
  });
}

export function buildReminderCopy(params: {
  reminderType: ReminderType;
  missingSlot: EngagementSlotDto | null;
  microStep: string | null;
  rankDeltaToday?: number;
}) {
  if (params.reminderType === 'COMEBACK') {
    return {
      title: 'Wroc do rytmu dzisiaj',
      body: params.microStep
        ? `Zrob jeden krok: ${params.microStep}`
        : 'Jedno 60-sekundowe domkniecie uruchomi comeback quest.'
    };
  }

  const slotText = params.missingSlot === 'SLOT_1' ? 'start dnia' : 'zamkniecie dnia';
  const deltaHint = params.rankDeltaToday && params.rankDeltaToday > 0 ? ` Awans: +${params.rankDeltaToday}.` : '';

  return {
    title: `Czas na ${slotText}`,
    body: params.microStep ? `${params.microStep}.${deltaHint}`.trim() : `Brakuje jednego ruchu, by domknac rytm.${deltaHint}`.trim()
  };
}

export function resolveLocalDateForUser(now: Date, timezone: string): string {
  return formatLocalDate(now, timezone);
}
