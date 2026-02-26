import { describe, expect, it } from 'vitest';

import {
  hasPushCooldown,
  isWithinQuietHours,
  resolveCheckInSlot,
  shouldRestoreStrongPressure,
  shouldDowngradePressure,
  SLOT1_XP,
  SLOT2_XP,
  xpForSlot
} from '@/lib/engagement';

describe('engagement helpers', () => {
  it('maps checkin to slot 1 before slot2 hour', () => {
    const slot = resolveCheckInSlot({
      timestamp: new Date('2026-02-26T18:30:00.000Z'),
      timezone: 'Europe/Warsaw',
      slot2HourLocal: 20
    });

    expect(slot).toBe('SLOT_1');
  });

  it('maps checkin to slot 2 at or after slot2 hour', () => {
    const slot = resolveCheckInSlot({
      timestamp: new Date('2026-02-26T20:30:00.000Z'),
      timezone: 'Europe/Warsaw',
      slot2HourLocal: 20
    });

    expect(slot).toBe('SLOT_2');
  });

  it('respects quiet hours and push cooldown', () => {
    expect(isWithinQuietHours(22, 0)).toBe(true);
    expect(isWithinQuietHours(7, 0)).toBe(true);
    expect(isWithinQuietHours(8, 0)).toBe(false);

    const now = new Date('2026-02-26T10:00:00.000Z');
    expect(hasPushCooldown(new Date('2026-02-26T07:00:01.000Z'), now)).toBe(true);
    expect(hasPushCooldown(new Date('2026-02-26T05:59:59.000Z'), now)).toBe(false);
  });

  it('downgrades pressure after 3 failed perfect days in a row', () => {
    expect(shouldDowngradePressure([false, false, false])).toBe(true);
    expect(shouldDowngradePressure([false, true, false])).toBe(false);
    expect(shouldDowngradePressure([false, false])).toBe(false);
  });

  it('restores strong pressure after two perfect days in a row', () => {
    expect(shouldRestoreStrongPressure([true, true, false])).toBe(true);
    expect(shouldRestoreStrongPressure([true, false, true])).toBe(false);
    expect(shouldRestoreStrongPressure([true])).toBe(false);
  });

  it('awards slot XP by slot', () => {
    expect(SLOT1_XP).toBe(10);
    expect(SLOT2_XP).toBe(25);
    expect(xpForSlot('SLOT_1')).toBe(10);
    expect(xpForSlot('SLOT_2')).toBe(25);
  });
});
