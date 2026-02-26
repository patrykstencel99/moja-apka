import { DEFAULT_TUTORIAL_VERSION } from '@/lib/tutorial/config';

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

function parseVersion(value: string | undefined, fallback: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function hashToBucket(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0) % 100;
}

export function isTutorialFeatureEnabled() {
  return parseBoolean(process.env.NEXT_PUBLIC_TUTORIAL_ENABLED, false);
}

export function resolveTutorialRolloutPercent() {
  return parsePercent(process.env.TUTORIAL_ROLLOUT_PERCENT, 0);
}

export function resolveTutorialVersion() {
  return parseVersion(process.env.TUTORIAL_VERSION, DEFAULT_TUTORIAL_VERSION);
}

export function isUserInTutorialRollout(userId: string, rolloutPercent = resolveTutorialRolloutPercent()) {
  if (rolloutPercent <= 0) {
    return false;
  }

  if (rolloutPercent >= 100) {
    return true;
  }

  return hashToBucket(userId) < rolloutPercent;
}
