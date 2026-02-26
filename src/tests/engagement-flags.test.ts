import { afterEach, describe, expect, it } from 'vitest';

import {
  isEngagementLoopV1Enabled,
  isUserInEngagementLoopV1,
  resolveEngagementLoopRolloutPercent
} from '@/lib/engagement-flags';

const ORIGINAL_ENV = {
  ENGAGEMENT_LOOP_V1_ENABLED: process.env.ENGAGEMENT_LOOP_V1_ENABLED,
  ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT: process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT
};

afterEach(() => {
  process.env.ENGAGEMENT_LOOP_V1_ENABLED = ORIGINAL_ENV.ENGAGEMENT_LOOP_V1_ENABLED;
  process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT = ORIGINAL_ENV.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT;
});

describe('engagement feature flags', () => {
  it('parses enabled and rollout env values', () => {
    process.env.ENGAGEMENT_LOOP_V1_ENABLED = 'true';
    process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT = '50';

    expect(isEngagementLoopV1Enabled()).toBe(true);
    expect(resolveEngagementLoopRolloutPercent()).toBe(50);
  });

  it('returns false when feature disabled globally', () => {
    process.env.ENGAGEMENT_LOOP_V1_ENABLED = 'false';
    process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT = '100';

    expect(isUserInEngagementLoopV1('user-123')).toBe(false);
  });

  it('uses deterministic hash bucket when rollout is partial', () => {
    process.env.ENGAGEMENT_LOOP_V1_ENABLED = 'true';
    process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT = '1';

    const first = isUserInEngagementLoopV1('user-a');
    const second = isUserInEngagementLoopV1('user-a');

    expect(first).toBe(second);
  });
});
