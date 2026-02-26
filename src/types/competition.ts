export type CompetitionMetric = 'score' | 'maxStreak' | 'totalCheckIns';

export type CompetitionPeriod =
  | '7d'
  | '30d'
  | '90d'
  | '365d'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | '5y'
  | 'all_time';

export type CompetitionTierUi = 'T1' | 'T2' | 'T3';

export type CompetitionLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarSeed: string | null;
  score: number;
  maxStreak: number;
  totalCheckIns: number;
  latestLocalDate: string;
};

export type CompetitionLeaderboardPayload = {
  metric: CompetitionMetric;
  period: CompetitionPeriod;
  generatedAt: string;
  rows: CompetitionLeaderboardRow[];
  closestRivals?: CompetitionLeaderboardRow[];
  promotionHint?: string;
};

export type BadgeProgress = {
  badge: string;
  title: string;
  description: string;
  earned: boolean;
  awardedAt: string | null;
  progress: number;
  target: number;
};
