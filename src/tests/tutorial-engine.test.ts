import { describe, expect, it } from 'vitest';

import { getTutorialDefinition } from '@/lib/tutorial/config';
import {
  canCompleteTutorial,
  normalizeCompletedStepIds,
  resolveCurrentStepId,
  resolveVersionedProgress,
  withCompletedStep
} from '@/lib/tutorial/engine';

describe('tutorial engine', () => {
  it('starts from first step when nothing is completed', () => {
    const definition = getTutorialDefinition(1);

    expect(resolveCurrentStepId([], definition)).toBe('core_v1_01_intro_today');
  });

  it('normalizes completed step ids and removes unknown values', () => {
    const definition = getTutorialDefinition(1);

    const result = normalizeCompletedStepIds(
      ['core_v1_01_intro_today', 'unknown_step', 'core_v1_02_first_checkin', 'core_v1_02_first_checkin'],
      definition
    );

    expect(result).toEqual(['core_v1_01_intro_today', 'core_v1_02_first_checkin']);
  });

  it('moves to next step after completion', () => {
    const definition = getTutorialDefinition(1);

    const completed = withCompletedStep([], 'core_v1_01_intro_today', definition);
    const current = resolveCurrentStepId(completed, definition);

    expect(current).toBe('core_v1_02_first_checkin');
  });

  it('requires core loop steps to allow completion', () => {
    const definition = getTutorialDefinition(1);

    expect(canCompleteTutorial([], definition)).toBe(false);
    expect(canCompleteTutorial(['core_v1_02_first_checkin', 'core_v1_04_activate_system', 'core_v1_06_review_loaded'], definition)).toBe(
      true
    );
  });

  it('resets skipped state on version migration', () => {
    const migrated = resolveVersionedProgress({
      fromVersion: 1,
      toVersion: 1,
      previousState: 'SKIPPED',
      previousCompletedStepIds: ['core_v1_01_intro_today']
    });

    expect(migrated.state).toBe('NOT_STARTED');
    expect(migrated.currentStepId).toBe('core_v1_01_intro_today');
    expect(migrated.completedStepIds).toEqual([]);
  });
});
