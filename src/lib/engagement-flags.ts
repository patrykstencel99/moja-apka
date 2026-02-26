function parseBoolean(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

function parsePercent(value: string | undefined, fallback: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, parsed));
}

function hashToBucket(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0) % 100;
}

export function isEngagementLoopV1Enabled() {
  return parseBoolean(process.env.ENGAGEMENT_LOOP_V1_ENABLED, true);
}

export function resolveEngagementLoopRolloutPercent() {
  return parsePercent(process.env.ENGAGEMENT_LOOP_V1_ROLLOUT_PERCENT, 100);
}

export function isUserInEngagementLoopV1(
  userId: string,
  rolloutPercent = resolveEngagementLoopRolloutPercent(),
  enabled = isEngagementLoopV1Enabled()
) {
  if (!enabled || rolloutPercent <= 0) {
    return false;
  }

  if (rolloutPercent >= 100) {
    return true;
  }

  return hashToBucket(userId) < rolloutPercent;
}
