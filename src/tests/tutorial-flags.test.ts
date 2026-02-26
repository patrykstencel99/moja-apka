import { afterEach, describe, expect, it } from 'vitest';

import {
  isTutorialFeatureEnabled,
  isUserInTutorialRollout,
  resolveTutorialRolloutPercent,
  resolveTutorialVersion
} from '@/lib/tutorial/feature-flags';

const ORIGINAL_ENV = {
  NEXT_PUBLIC_TUTORIAL_ENABLED: process.env.NEXT_PUBLIC_TUTORIAL_ENABLED,
  TUTORIAL_ROLLOUT_PERCENT: process.env.TUTORIAL_ROLLOUT_PERCENT,
  TUTORIAL_VERSION: process.env.TUTORIAL_VERSION
};

afterEach(() => {
  process.env.NEXT_PUBLIC_TUTORIAL_ENABLED = ORIGINAL_ENV.NEXT_PUBLIC_TUTORIAL_ENABLED;
  process.env.TUTORIAL_ROLLOUT_PERCENT = ORIGINAL_ENV.TUTORIAL_ROLLOUT_PERCENT;
  process.env.TUTORIAL_VERSION = ORIGINAL_ENV.TUTORIAL_VERSION;
});

describe('tutorial feature flags', () => {
  it('parses feature switch and rollout percent', () => {
    process.env.NEXT_PUBLIC_TUTORIAL_ENABLED = 'true';
    process.env.TUTORIAL_ROLLOUT_PERCENT = '50';

    expect(isTutorialFeatureEnabled()).toBe(true);
    expect(resolveTutorialRolloutPercent()).toBe(50);
  });

  it('handles version fallback and clamps percent', () => {
    process.env.TUTORIAL_VERSION = '0';
    process.env.TUTORIAL_ROLLOUT_PERCENT = '200';

    expect(resolveTutorialVersion()).toBe(1);
    expect(resolveTutorialRolloutPercent()).toBe(100);
  });

  it('keeps rollout deterministic for given user', () => {
    const first = isUserInTutorialRollout('user-123', 25);
    const second = isUserInTutorialRollout('user-123', 25);

    expect(first).toBe(second);
  });
});
