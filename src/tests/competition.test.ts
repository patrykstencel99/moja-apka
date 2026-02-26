import { describe, expect, it } from 'vitest';

import { competitionTierFromStreak, resolveCompetitionMetric, resolveCompetitionPeriod } from '@/lib/competition';

describe('competition helpers', () => {
  it('maps streak to tier thresholds', () => {
    expect(competitionTierFromStreak(1)).toBe('T1');
    expect(competitionTierFromStreak(4)).toBe('T1');
    expect(competitionTierFromStreak(5)).toBe('T2');
    expect(competitionTierFromStreak(14)).toBe('T2');
    expect(competitionTierFromStreak(15)).toBe('T3');
  });

  it('resolves metric with fallback', () => {
    expect(resolveCompetitionMetric('score')).toBe('score');
    expect(resolveCompetitionMetric('maxStreak')).toBe('maxStreak');
    expect(resolveCompetitionMetric('totalCheckIns')).toBe('totalCheckIns');
    expect(resolveCompetitionMetric('other')).toBe('score');
  });

  it('resolves period with fallback', () => {
    expect(resolveCompetitionPeriod('7d')).toBe('7d');
    expect(resolveCompetitionPeriod('this_month')).toBe('this_month');
    expect(resolveCompetitionPeriod('all_time')).toBe('all_time');
    expect(resolveCompetitionPeriod('anything')).toBe('30d');
  });
});
