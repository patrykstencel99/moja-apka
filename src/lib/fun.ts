import {
  ActivityDefinition,
  ActivityType,
  DuelChoice,
  DuelResult,
  DuelStatus,
  QuestStatus,
  StampTier,
  User,
  UserFocus,
  type BossWeek,
  type DailyQuest,
  type DailyStamp,
  type GamificationState,
  type NextMoveDuel
} from '@prisma/client';
import { getISOWeek, getISOWeekYear } from 'date-fns';

import { inferActivityMeta } from '@/lib/activity-meta';
import { dayDiff, formatLocalDate, parseLocalDate } from '@/lib/date';
import { levelFromXp } from '@/lib/gamification';
import { prisma } from '@/lib/prisma';
import { buildNextMove, type NextMoveInputSignal } from '@/lib/state/next-move';
import type {
  BossWeekDto,
  DailyQuestDto,
  DuelChoiceDto,
  DuelDto,
  DuelResultDto,
  DuelStatusDto,
  FunTodayPayload,
  StampDto,
  ThemeDto
} from '@/types/fun';

const QUEST_BASE_XP = 20;
const BOSS_WEEK_BONUS_XP = 50;
const COMBO_MIN_BPS = 100;
const COMBO_MAX_BPS = 200;
const COMBO_STEP_BPS = 10;

type QuestStrategy = 'BOOLEAN_TRUE' | 'BOOLEAN_FALSE' | 'NUMERIC_MIN' | 'CHECKIN_ONLY';

type QuestTemplate = {
  key: string;
  title: string;
  description: string;
  strategy: QuestStrategy;
  activityAliases: string[];
  numericMin?: number;
};

type ThemeDefinition = {
  key: string;
  label: string;
  minLevel: number;
};

type CheckInValueInput = {
  activityId: string;
  booleanValue?: boolean;
  numericValue?: number;
};

type EvaluatedFunState = {
  quest: DailyQuestDto;
  combo: {
    comboBps: number;
    displayMultiplier: number;
  };
  bossWeek: BossWeekDto;
  duel: DuelDto | null;
  stamp: StampDto | null;
};

const QUESTS_BY_FOCUS: Record<UserFocus, QuestTemplate[]> = {
  ENERGY: [
    {
      key: 'energy_first_meal_90',
      title: 'Domknij pierwszy posilek do 90 minut',
      description: 'Podtrzymujesz stabilnosc energii przez start dnia.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Pierwszy posilek do 90 min od pobudki']
    },
    {
      key: 'energy_hydration_noon',
      title: 'Nawodnienie do poludnia',
      description: 'Pilnujesz prostego stabilizatora energii.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Nawodnienie do poludnia']
    },
    {
      key: 'energy_no_drop_14',
      title: 'Bez spadku energii przed 14:00',
      description: 'Chronisz pierwsza polowe dnia przed twardym zjazdem.',
      strategy: 'BOOLEAN_FALSE',
      activityAliases: ['Spadek energii przed 14:00']
    }
  ],
  FOCUS: [
    {
      key: 'focus_deep_work',
      title: '60 minut glebokiej pracy',
      description: 'Zamykasz jeden blok bez rozproszen.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['60 minut glebokiej pracy przed poludniem', '60 min glebokiej pracy przed poludniem']
    },
    {
      key: 'focus_one_priority',
      title: 'Plan jednego priorytetu',
      description: 'Ustalasz jeden cel, ktory prowadzi dzien.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Plan jednego priorytetu dnia']
    },
    {
      key: 'focus_mute_notifications',
      title: 'Wycisz powiadomienia podczas bloku',
      description: 'Obronisz uwage przez prosty filtr bodzcow.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Notyfikacje wyciszone podczas bloku', 'Powiadomienia wyciszone podczas bloku']
    }
  ],
  SLEEP: [
    {
      key: 'sleep_no_screen',
      title: 'Brak ekranu 45 minut przed snem',
      description: 'Wyhamowujesz bodzce i ulatwiasz zasypianie.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Brak ekranu 45 minut przed snem', 'Brak ekranu 45 min przed snem']
    },
    {
      key: 'sleep_planned_hour',
      title: 'Godzina snu zgodna z planem',
      description: 'Trzymasz rytm i przewidywalnosc regeneracji.',
      strategy: 'BOOLEAN_TRUE',
      activityAliases: ['Godzina snu zgodna z planem']
    },
    {
      key: 'sleep_refresh_score',
      title: 'Poranne odswiezenie >= 6',
      description: 'Sprawdzasz, czy poranek sygnalizuje dobra regeneracje.',
      strategy: 'NUMERIC_MIN',
      activityAliases: ['Poranny poziom odswiezenia (0-10)', 'Poranne odswiezenie'],
      numericMin: 6
    }
  ]
};

const THEME_DEFINITIONS: ThemeDefinition[] = [
  { key: 'obsidian-command', label: 'Obsidian Command', minLevel: 1 },
  { key: 'ivory-ledger', label: 'Ivory Ledger', minLevel: 3 },
  { key: 'royal-blueprint', label: 'Royal Blueprint', minLevel: 6 },
  { key: 'burgundy-arc', label: 'Burgundy Arc', minLevel: 9 },
  { key: 'gold-reserve', label: 'Gold Reserve', minLevel: 12 },
  { key: 'retro-fieldbook', label: 'Retro Fieldbook', minLevel: 16 }
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function tierRank(tier: StampTier): number {
  if (tier === StampTier.BRONZE) {
    return 1;
  }
  if (tier === StampTier.SILVER) {
    return 2;
  }
  if (tier === StampTier.GOLD) {
    return 3;
  }
  return 4;
}

function weekKeyFromLocalDate(localDate: string): string {
  const date = parseLocalDate(localDate);
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-${String(week).padStart(2, '0')}`;
}

function mapQuestDto(quest: DailyQuest): DailyQuestDto {
  return {
    id: quest.id,
    localDate: quest.localDate,
    status: quest.status,
    title: quest.title,
    description: quest.description,
    rewardXp: quest.rewardXp,
    completedAt: quest.completedAt ? quest.completedAt.toISOString() : null
  };
}

function mapBossDto(boss: BossWeek): BossWeekDto {
  return {
    weekKey: boss.weekKey,
    hpCurrent: boss.hpCurrent,
    hpMax: boss.hpMax,
    cleared: Boolean(boss.clearedAt),
    clearedAt: boss.clearedAt ? boss.clearedAt.toISOString() : null
  };
}

function mapDuelStatus(value: DuelStatus): DuelStatusDto {
  return value;
}

function mapDuelChoice(value: DuelChoice | null): DuelChoiceDto | null {
  return value;
}

function mapDuelResult(value: DuelResult | null): DuelResultDto | null {
  return value;
}

function mapDuelDto(duel: NextMoveDuel): DuelDto {
  return {
    id: duel.id,
    localDate: duel.localDate,
    status: mapDuelStatus(duel.status),
    optionA: {
      title: duel.optionATitle,
      why: duel.optionAWhy,
      minimalVariant: duel.optionAMinimalVariant,
      confidence: duel.optionAConfidence,
      lag: duel.optionALag as 0 | 1
    },
    optionB: {
      title: duel.optionBTitle,
      why: duel.optionBWhy,
      minimalVariant: duel.optionBMinimalVariant,
      confidence: duel.optionBConfidence,
      lag: duel.optionBLag as 0 | 1
    },
    selectedChoice: mapDuelChoice(duel.selectedChoice),
    result: mapDuelResult(duel.result)
  };
}

function mapStampDto(stamp: DailyStamp | null): StampDto | null {
  if (!stamp) {
    return null;
  }

  return {
    localDate: stamp.localDate,
    tier: stamp.tier
  };
}

function findActivityByAliases(activities: ActivityDefinition[], aliases: string[]) {
  const aliasesSet = new Set(aliases.map((value) => normalize(value)));
  return activities.find((activity) => aliasesSet.has(normalize(activity.name)));
}

function buildQuestSelection(params: {
  userId: string;
  localDate: string;
  focus: UserFocus;
  activities: ActivityDefinition[];
}): { template: QuestTemplate; activity: ActivityDefinition | null } {
  const { userId, localDate, focus, activities } = params;

  const templates = QUESTS_BY_FOCUS[focus];
  const viable = templates
    .map((template) => ({
      template,
      activity: findActivityByAliases(activities, template.activityAliases)
    }))
    .filter((entry): entry is { template: QuestTemplate; activity: ActivityDefinition } => Boolean(entry.activity));

  if (viable.length === 0) {
    return {
      template: {
        key: 'fallback_checkin',
        title: 'Zrob minimum jeden check-in',
        description: 'Dzis cel to domknac podstawowa petle dnia.',
        strategy: 'CHECKIN_ONLY',
        activityAliases: []
      },
      activity: null
    };
  }

  const index = hashString(`${userId}:${localDate}:${focus}`) % viable.length;
  return viable[index]!;
}

async function ensureGamificationState(userId: string): Promise<GamificationState> {
  return prisma.gamificationState.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
}

async function expirePastQuests(userId: string, localDate: string) {
  await prisma.dailyQuest.updateMany({
    where: {
      userId,
      localDate: { lt: localDate },
      status: QuestStatus.PENDING
    },
    data: {
      status: QuestStatus.EXPIRED,
      expiredAt: new Date()
    }
  });
}

async function ensureDailyQuest(params: {
  userId: string;
  focus: UserFocus;
  localDate: string;
  activities: ActivityDefinition[];
}): Promise<DailyQuest> {
  const existing = await prisma.dailyQuest.findUnique({
    where: {
      userId_localDate: {
        userId: params.userId,
        localDate: params.localDate
      }
    }
  });

  if (existing) {
    return existing;
  }

  const selection = buildQuestSelection(params);

  return prisma.dailyQuest.create({
    data: {
      userId: params.userId,
      localDate: params.localDate,
      focus: params.focus,
      questKey: selection.template.key,
      title: selection.template.title,
      description: selection.template.description,
      strategy: selection.template.strategy,
      activityId: selection.activity?.id,
      activityName: selection.activity?.name,
      numericMin: selection.template.numericMin ?? null,
      rewardXp: QUEST_BASE_XP
    }
  });
}

async function ensureBossWeek(userId: string, localDate: string): Promise<BossWeek> {
  const weekKey = weekKeyFromLocalDate(localDate);
  return prisma.bossWeek.upsert({
    where: {
      userId_weekKey: {
        userId,
        weekKey
      }
    },
    create: {
      userId,
      weekKey,
      hpCurrent: 7,
      hpMax: 7
    },
    update: {}
  });
}

function makeSignalsInput(values: CheckInValueInput[], activities: ActivityDefinition[]): NextMoveInputSignal[] {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const result: NextMoveInputSignal[] = [];

  for (const value of values) {
    const activity = activityMap.get(value.activityId);
    if (!activity) {
      continue;
    }

    const meta = inferActivityMeta(activity);
    result.push({
      name: activity.name,
      type: activity.type,
      booleanValue: activity.type === ActivityType.BOOLEAN ? Boolean(value.booleanValue) : undefined,
      numericValue: activity.type === ActivityType.NUMERIC_0_10 ? Number(value.numericValue ?? 0) : undefined,
      valenceHint: meta.valenceHint
    });
  }

  return result;
}

function getFallbackSignals(activities: ActivityDefinition[]): NextMoveInputSignal[] {
  return activities.slice(0, 3).map((activity) => {
    const meta = inferActivityMeta(activity);
    return {
      name: activity.name,
      type: activity.type,
      booleanValue: activity.type === ActivityType.BOOLEAN ? false : undefined,
      numericValue: activity.type === ActivityType.NUMERIC_0_10 ? 0 : undefined,
      valenceHint: meta.valenceHint
    };
  });
}

function buildDuelOptions(params: {
  mood: number;
  energy: number;
  signals: NextMoveInputSignal[];
}) {
  const { mood, energy, signals } = params;

  const optionA = buildNextMove({
    mood,
    energy,
    signals,
    variantIndex: 0
  });
  let optionB = buildNextMove({
    mood,
    energy,
    signals,
    variantIndex: 1
  });

  if (optionA.title === optionB.title) {
    optionB = buildNextMove({
      mood,
      energy,
      signals,
      variantIndex: 2
    });
  }

  return { optionA, optionB };
}

async function ensureDailyDuel(params: {
  userId: string;
  localDate: string;
  sourceCheckInId?: string;
  mood: number;
  energy: number;
  signals: NextMoveInputSignal[];
}): Promise<NextMoveDuel> {
  const existing = await prisma.nextMoveDuel.findUnique({
    where: {
      userId_localDate: {
        userId: params.userId,
        localDate: params.localDate
      }
    }
  });

  if (existing) {
    return existing;
  }

  const options = buildDuelOptions({
    mood: params.mood,
    energy: params.energy,
    signals: params.signals
  });

  return prisma.nextMoveDuel.create({
    data: {
      userId: params.userId,
      localDate: params.localDate,
      status: DuelStatus.PENDING_SELECTION,
      sourceCheckInId: params.sourceCheckInId,
      optionATitle: options.optionA.title,
      optionAWhy: options.optionA.why,
      optionAMinimalVariant: options.optionA.minimalVariant,
      optionAConfidence: options.optionA.confidence,
      optionALag: options.optionA.lag,
      optionBTitle: options.optionB.title,
      optionBWhy: options.optionB.why,
      optionBMinimalVariant: options.optionB.minimalVariant,
      optionBConfidence: options.optionB.confidence,
      optionBLag: options.optionB.lag
    }
  });
}

async function upsertStampTier(params: { userId: string; localDate: string; targetTier: StampTier }): Promise<DailyStamp> {
  const { userId, localDate, targetTier } = params;
  const existing = await prisma.dailyStamp.findUnique({
    where: {
      userId_localDate: {
        userId,
        localDate
      }
    }
  });

  if (!existing) {
    return prisma.dailyStamp.create({
      data: {
        userId,
        localDate,
        tier: targetTier
      }
    });
  }

  if (tierRank(existing.tier) >= tierRank(targetTier)) {
    return existing;
  }

  return prisma.dailyStamp.update({
    where: { id: existing.id },
    data: { tier: targetTier }
  });
}

function evaluateQuestCompletion(params: {
  quest: DailyQuest;
  valuesByActivityId: Map<string, CheckInValueInput>;
}): boolean {
  const { quest, valuesByActivityId } = params;

  if (quest.strategy === 'CHECKIN_ONLY') {
    return true;
  }

  if (!quest.activityId) {
    return false;
  }

  const value = valuesByActivityId.get(quest.activityId);
  if (!value) {
    return false;
  }

  if (quest.strategy === 'BOOLEAN_TRUE') {
    return Boolean(value.booleanValue);
  }
  if (quest.strategy === 'BOOLEAN_FALSE') {
    return value.booleanValue === false;
  }
  if (quest.strategy === 'NUMERIC_MIN') {
    const threshold = quest.numericMin ?? 0;
    return Number(value.numericValue ?? 0) >= threshold;
  }

  return false;
}

function getQuestRewardXp(comboBps: number): number {
  return Math.round((QUEST_BASE_XP * comboBps) / 100);
}

async function completeQuestAndApplyRewards(params: {
  userId: string;
  localDate: string;
  questId: string;
  gamificationState: GamificationState;
}): Promise<{
  updatedState: GamificationState;
  bossWeek: BossWeek;
  bossClearedNow: boolean;
}> {
  const now = new Date();
  const weekKey = weekKeyFromLocalDate(params.localDate);

  return prisma.$transaction(async (tx) => {
    const questUpdate = await tx.dailyQuest.updateMany({
      where: {
        id: params.questId,
        status: QuestStatus.PENDING
      },
      data: {
        status: QuestStatus.COMPLETED,
        completedAt: now
      }
    });

    const baselineState = await tx.gamificationState.findUnique({ where: { userId: params.userId } });
    const state = baselineState ?? params.gamificationState;

    if (questUpdate.count === 0) {
      const boss = await tx.bossWeek.upsert({
        where: {
          userId_weekKey: {
            userId: params.userId,
            weekKey
          }
        },
        create: {
          userId: params.userId,
          weekKey,
          hpCurrent: 7,
          hpMax: 7
        },
        update: {}
      });

      return {
        updatedState: state,
        bossWeek: boss,
        bossClearedNow: false
      };
    }

    let comboBps = state.comboBps;
    if (state.lastQuestDate && dayDiff(state.lastQuestDate, params.localDate) > 1) {
      comboBps = COMBO_MIN_BPS;
    }

    const questRewardXp = getQuestRewardXp(comboBps);
    const nextCombo = Math.min(COMBO_MAX_BPS, comboBps + COMBO_STEP_BPS);

    const bossBefore = await tx.bossWeek.upsert({
      where: {
        userId_weekKey: {
          userId: params.userId,
          weekKey
        }
      },
      create: {
        userId: params.userId,
        weekKey,
        hpCurrent: 7,
        hpMax: 7
      },
      update: {}
    });

    const nextHp = Math.max(0, bossBefore.hpCurrent - 1);
    const bossClearedNow = !bossBefore.clearedAt && nextHp === 0;
    const bossBonusXp = bossClearedNow && !bossBefore.rewardGranted ? BOSS_WEEK_BONUS_XP : 0;

    const totalXp = state.totalXp + questRewardXp + bossBonusXp;
    const level = levelFromXp(totalXp);

    const updatedState = await tx.gamificationState.update({
      where: { userId: params.userId },
      data: {
        totalXp,
        level,
        comboBps: nextCombo,
        lastQuestDate: params.localDate
      }
    });

    const bossWeek = await tx.bossWeek.update({
      where: { id: bossBefore.id },
      data: {
        hpCurrent: nextHp,
        clearedAt: bossClearedNow ? now : bossBefore.clearedAt,
        rewardGranted: bossClearedNow ? true : bossBefore.rewardGranted
      }
    });

    return {
      updatedState,
      bossWeek,
      bossClearedNow
    };
  });
}

async function loadTodayDuel(params: {
  userId: string;
  localDate: string;
  activities: ActivityDefinition[];
}): Promise<NextMoveDuel | null> {
  const existing = await prisma.nextMoveDuel.findUnique({
    where: {
      userId_localDate: {
        userId: params.userId,
        localDate: params.localDate
      }
    }
  });

  if (existing) {
    return existing;
  }

  const latestCheckIn = await prisma.checkIn.findFirst({
    where: {
      userId: params.userId,
      localDate: params.localDate
    },
    orderBy: { createdAt: 'desc' },
    include: {
      values: true
    }
  });

  if (!latestCheckIn) {
    return null;
  }

  const signals = makeSignalsInput(
    latestCheckIn.values.map((value) => ({
      activityId: value.activityId,
      booleanValue: value.booleanValue ?? undefined,
      numericValue: value.numericValue ?? undefined
    })),
    params.activities
  );

  const inputSignals = signals.length > 0 ? signals : getFallbackSignals(params.activities);
  return ensureDailyDuel({
    userId: params.userId,
    localDate: params.localDate,
    sourceCheckInId: latestCheckIn.id,
    mood: latestCheckIn.mood,
    energy: latestCheckIn.energy,
    signals: inputSignals
  });
}

export async function getTodayFunState(params: {
  user: User;
  localDate: string;
}): Promise<FunTodayPayload> {
  const { user, localDate } = params;
  await ensureGamificationState(user.id);
  await expirePastQuests(user.id, localDate);

  const activities = await prisma.activityDefinition.findMany({
    where: {
      userId: user.id,
      archivedAt: null
    }
  });

  const [quest, bossWeek, stamp, duel, state] = await Promise.all([
    ensureDailyQuest({
      userId: user.id,
      focus: user.focus,
      localDate,
      activities
    }),
    ensureBossWeek(user.id, localDate),
    prisma.dailyStamp.findUnique({
      where: {
        userId_localDate: {
          userId: user.id,
          localDate
        }
      }
    }),
    loadTodayDuel({
      userId: user.id,
      localDate,
      activities
    }),
    ensureGamificationState(user.id)
  ]);

  return {
    quest: mapQuestDto(quest),
    combo: {
      comboBps: state.comboBps,
      displayMultiplier: Number((state.comboBps / 100).toFixed(1))
    },
    bossWeek: mapBossDto(bossWeek),
    duel: duel ? mapDuelDto(duel) : null,
    stamp: mapStampDto(stamp)
  };
}

export async function evaluateFunAfterCheckIn(params: {
  user: User;
  localDate: string;
  checkInId: string;
  mood: number;
  energy: number;
  values: CheckInValueInput[];
}): Promise<EvaluatedFunState> {
  const { user, localDate } = params;

  await ensureGamificationState(user.id);
  await expirePastQuests(user.id, localDate);

  const activities = await prisma.activityDefinition.findMany({
    where: {
      userId: user.id,
      archivedAt: null
    }
  });

  const initialState = await ensureGamificationState(user.id);
  let quest = await ensureDailyQuest({
    userId: user.id,
    focus: user.focus,
    localDate,
    activities
  });
  let bossWeek = await ensureBossWeek(user.id, localDate);
  let currentState = initialState;

  const valuesByActivityId = new Map(params.values.map((value) => [value.activityId, value]));
  const shouldCompleteQuest = quest.status === QuestStatus.PENDING && evaluateQuestCompletion({ quest, valuesByActivityId });

  let bossClearedNow = false;
  if (shouldCompleteQuest) {
    const rewardResult = await completeQuestAndApplyRewards({
      userId: user.id,
      localDate,
      questId: quest.id,
      gamificationState: initialState
    });
    currentState = rewardResult.updatedState;
    bossWeek = rewardResult.bossWeek;
    bossClearedNow = rewardResult.bossClearedNow;
  }

  quest = await prisma.dailyQuest.findUniqueOrThrow({
    where: { id: quest.id }
  });

  const signals = makeSignalsInput(params.values, activities);
  const duel = await ensureDailyDuel({
    userId: user.id,
    localDate,
    sourceCheckInId: params.checkInId,
    mood: params.mood,
    energy: params.energy,
    signals: signals.length > 0 ? signals : getFallbackSignals(activities)
  });

  let targetStampTier: StampTier = StampTier.BRONZE;
  if (quest.status === QuestStatus.COMPLETED) {
    targetStampTier = StampTier.SILVER;
  }
  if (bossClearedNow) {
    targetStampTier = StampTier.OBSIDIAN;
  }

  const stamp = await upsertStampTier({
    userId: user.id,
    localDate,
    targetTier: targetStampTier
  });

  return {
    quest: mapQuestDto(quest),
    combo: {
      comboBps: currentState.comboBps,
      displayMultiplier: Number((currentState.comboBps / 100).toFixed(1))
    },
    bossWeek: mapBossDto(bossWeek),
    duel: mapDuelDto(duel),
    stamp: mapStampDto(stamp)
  };
}

export async function selectDuelOption(params: {
  user: User;
  duelId: string;
  choice: DuelChoice;
}): Promise<DuelDto> {
  const duel = await prisma.nextMoveDuel.findFirst({
    where: {
      id: params.duelId,
      userId: params.user.id
    }
  });

  if (!duel) {
    throw new Error('NOT_FOUND');
  }
  if (duel.status !== DuelStatus.PENDING_SELECTION) {
    throw new Error('INVALID_STATE');
  }

  const updated = await prisma.nextMoveDuel.update({
    where: { id: duel.id },
    data: {
      status: DuelStatus.SELECTED,
      selectedChoice: params.choice,
      selectedAt: new Date()
    }
  });

  const quest = await prisma.dailyQuest.findUnique({
    where: {
      userId_localDate: {
        userId: params.user.id,
        localDate: updated.localDate
      }
    }
  });

  if (quest?.status === QuestStatus.COMPLETED) {
    const existingStamp = await prisma.dailyStamp.findUnique({
      where: {
        userId_localDate: {
          userId: params.user.id,
          localDate: updated.localDate
        }
      }
    });

    const targetTier = existingStamp?.tier === StampTier.OBSIDIAN ? StampTier.OBSIDIAN : StampTier.GOLD;
    await upsertStampTier({
      userId: params.user.id,
      localDate: updated.localDate,
      targetTier
    });
  }

  return mapDuelDto(updated);
}

export async function evaluateDuelResult(params: {
  user: User;
  duelId: string;
  result: DuelResult;
}): Promise<DuelDto> {
  const duel = await prisma.nextMoveDuel.findFirst({
    where: {
      id: params.duelId,
      userId: params.user.id
    }
  });

  if (!duel) {
    throw new Error('NOT_FOUND');
  }
  if (duel.status !== DuelStatus.SELECTED) {
    throw new Error('INVALID_STATE');
  }

  const todayLocalDate = formatLocalDate(new Date(), params.user.timezone);
  if (duel.localDate >= todayLocalDate) {
    throw new Error('TOO_EARLY');
  }

  const updated = await prisma.nextMoveDuel.update({
    where: { id: duel.id },
    data: {
      status: DuelStatus.EVALUATED,
      result: params.result,
      evaluatedAt: new Date()
    }
  });

  return mapDuelDto(updated);
}

export async function listDuelHistory(params: { userId: string; limit: number }): Promise<DuelDto[]> {
  const limit = Math.max(1, Math.min(300, Math.trunc(params.limit)));
  const items = await prisma.nextMoveDuel.findMany({
    where: { userId: params.userId },
    orderBy: [{ localDate: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });

  return items.map((item) => mapDuelDto(item));
}

export async function listStamps(params: {
  userId: string;
  from: string;
  to: string;
}): Promise<{ stamps: StampDto[]; counts: Record<StampTier, number> }> {
  const stamps = await prisma.dailyStamp.findMany({
    where: {
      userId: params.userId,
      localDate: {
        gte: params.from,
        lte: params.to
      }
    },
    orderBy: [{ localDate: 'asc' }]
  });

  const counts: Record<StampTier, number> = {
    BRONZE: 0,
    SILVER: 0,
    GOLD: 0,
    OBSIDIAN: 0
  };

  for (const stamp of stamps) {
    counts[stamp.tier] += 1;
  }

  return {
    stamps: stamps.map((stamp) => ({
      localDate: stamp.localDate,
      tier: stamp.tier
    })),
    counts
  };
}

export function listThemesForLevel(level: number, activeTheme: string): ThemeDto[] {
  return THEME_DEFINITIONS.map((theme) => ({
    key: theme.key,
    label: theme.label,
    minLevel: theme.minLevel,
    unlocked: level >= theme.minLevel,
    active: theme.key === activeTheme
  }));
}

export function getThemeDefinition(themeKey: string): ThemeDefinition | null {
  return THEME_DEFINITIONS.find((theme) => theme.key === themeKey) ?? null;
}

export async function getThemesForUser(userId: string) {
  const [state, user] = await Promise.all([
    ensureGamificationState(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { themeKey: true }
    })
  ]);

  return {
    themes: listThemesForLevel(state.level, user.themeKey ?? 'obsidian-command'),
    activeTheme: user.themeKey ?? 'obsidian-command',
    level: state.level
  };
}

export async function setThemeForUser(params: {
  userId: string;
  themeKey: string;
}): Promise<{ activeTheme: string; themes: ThemeDto[]; level: number }> {
  const definition = getThemeDefinition(params.themeKey);
  if (!definition) {
    throw new Error('UNKNOWN_THEME');
  }

  const state = await ensureGamificationState(params.userId);
  if (state.level < definition.minLevel) {
    throw new Error('THEME_LOCKED');
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      themeKey: definition.key
    }
  });

  return {
    themes: listThemesForLevel(state.level, definition.key),
    activeTheme: definition.key,
    level: state.level
  };
}
