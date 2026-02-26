export type QuestStatusDto = 'PENDING' | 'COMPLETED' | 'EXPIRED';
export type StampTierDto = 'BRONZE' | 'SILVER' | 'GOLD' | 'OBSIDIAN';
export type DuelStatusDto = 'PENDING_SELECTION' | 'SELECTED' | 'EVALUATED';
export type DuelChoiceDto = 'A' | 'B';
export type DuelResultDto = 'BETTER' | 'SAME' | 'WORSE';

export type DuelOptionDto = {
  title: string;
  why: string;
  minimalVariant: string;
  confidence: number;
  lag: 0 | 1;
};

export type DailyQuestDto = {
  id: string;
  localDate: string;
  status: QuestStatusDto;
  title: string;
  description: string;
  rewardXp: number;
  completedAt: string | null;
};

export type ComboStateDto = {
  comboBps: number;
  displayMultiplier: number;
};

export type BossWeekDto = {
  weekKey: string;
  hpCurrent: number;
  hpMax: number;
  cleared: boolean;
  clearedAt: string | null;
};

export type DuelDto = {
  id: string;
  localDate: string;
  status: DuelStatusDto;
  optionA: DuelOptionDto;
  optionB: DuelOptionDto;
  selectedChoice: DuelChoiceDto | null;
  result: DuelResultDto | null;
};

export type StampDto = {
  localDate: string;
  tier: StampTierDto;
};

export type ThemeDto = {
  key: string;
  label: string;
  minLevel: number;
  unlocked: boolean;
  active: boolean;
};

export type EngagementSlotDto = 'SLOT_1' | 'SLOT_2';

export type EngagementTodayDto = {
  slot1Done: boolean;
  slot2Done: boolean;
  perfectDay: boolean;
  perfectDays7d: number;
  perfectDays30d: number;
  rescueQuestActive: boolean;
  rescueCompletedToday: boolean;
  comebackGapDays: number | null;
  lastCompletedSlot: EngagementSlotDto | null;
  xpAwardedToday: number;
  nextReminderAt: string | null;
  rankDeltaToday: number;
  riskOfDrop: number;
  socialPressureMode: 'STRONG' | 'SOFT';
};

export type FunTodayPayload = {
  quest: DailyQuestDto;
  combo: ComboStateDto;
  bossWeek: BossWeekDto;
  duel: DuelDto | null;
  stamp: StampDto | null;
  engagement: EngagementTodayDto;
};
