import { createHash } from 'crypto';

import { getEnv } from '@/lib/env';
import { SESSION_COOKIE, ONBOARDING_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session-constants';

export { SESSION_COOKIE, ONBOARDING_COOKIE, SESSION_MAX_AGE_SECONDS };

export function hashSessionToken(token: string): string {
  const secret = getEnv('SESSION_SECRET');
  return createHash('sha256').update(`${token}:${secret}`).digest('hex');
}
