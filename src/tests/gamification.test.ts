import { describe, expect, it } from 'vitest';

import { deriveStreak, levelFromXp } from '@/lib/gamification';

describe('gamification helpers', () => {
  it('resets streak when a day is skipped', () => {
    const streak = deriveStreak({
      lastLocalDate: '2026-02-10',
      currentLocalDate: '2026-02-12',
      currentStreak: 5
    });

    expect(streak).toBe(1);
  });

  it('increments streak on consecutive day', () => {
    const streak = deriveStreak({
      lastLocalDate: '2026-02-10',
      currentLocalDate: '2026-02-11',
      currentStreak: 5
    });

    expect(streak).toBe(6);
  });

  it('calculates levels from XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
  });
});
