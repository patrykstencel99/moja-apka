import { describe, expect, it } from 'vitest';

import { classifyPushStatus, normalizePushPayload, resolvePushTransportMode } from '@/lib/push-transport';

describe('push transport helpers', () => {
  it('resolves transport mode with simulate fallback', () => {
    expect(resolvePushTransportMode('webpush')).toBe('webpush');
    expect(resolvePushTransportMode('disabled')).toBe('disabled');
    expect(resolvePushTransportMode('anything-else')).toBe('simulate');
    expect(resolvePushTransportMode(undefined)).toBe('simulate');
  });

  it('normalizes payload to safe defaults', () => {
    expect(normalizePushPayload(null)).toEqual({
      title: 'PatternFinder',
      body: 'Czas na check-in.',
      url: '/today'
    });

    expect(
      normalizePushPayload({
        title: 'Hej',
        body: 'Domknij slot',
        url: '/today'
      })
    ).toEqual({
      title: 'Hej',
      body: 'Domknij slot',
      url: '/today'
    });
  });

  it('classifies push statuses for retry and hard fail', () => {
    expect(classifyPushStatus(410)).toEqual({ hardFail: true, temporary: false });
    expect(classifyPushStatus(429)).toEqual({ hardFail: false, temporary: true });
    expect(classifyPushStatus(500)).toEqual({ hardFail: false, temporary: true });
    expect(classifyPushStatus(400)).toEqual({ hardFail: false, temporary: false });
  });
});
