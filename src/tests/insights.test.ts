import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { buildInsightsReport, confidenceScore, type CheckInForInsights } from '@/lib/insights';

function makeCheckIns(): CheckInForInsights[] {
  const list: CheckInForInsights[] = [];

  for (let i = 1; i <= 7; i++) {
    const training = i % 2 === 0;
    const mood = training ? 8 : 4;
    const energy = training ? 8 : 5;

    list.push({
      localDate: `2026-02-0${i}`,
      mood,
      energy,
      createdAt: new Date(`2026-02-0${i}T12:00:00.000Z`),
      values: [
        {
          booleanValue: training,
          numericValue: null,
          activity: {
            id: 'a1',
            name: 'Trening wykonany',
            type: ActivityType.BOOLEAN
          }
        },
        {
          booleanValue: null,
          numericValue: training ? 8 : 3,
          activity: {
            id: 'a2',
            name: 'Dobra jakosc snu',
            type: ActivityType.NUMERIC_0_10
          }
        }
      ]
    });
  }

  return list;
}

describe('insights report', () => {
  it('returns insufficient data when there are less than 7 days', () => {
    const report = buildInsightsReport({
      checkins: makeCheckIns().slice(0, 3),
      window: 'weekly',
      from: '2026-02-01',
      to: '2026-02-03'
    });

    expect(report.insufficientData).toBe(true);
    expect(report.positive).toHaveLength(0);
    expect(report.negative).toHaveLength(0);
  });

  it('ranks positive factors for enough data', () => {
    const report = buildInsightsReport({
      checkins: makeCheckIns(),
      window: 'weekly',
      from: '2026-02-01',
      to: '2026-02-07'
    });

    expect(report.insufficientData).toBe(false);
    expect(report.positive.length).toBeGreaterThan(0);
    expect(report.positive.some((x) => ['Trening wykonany', 'Dobra jakosc snu'].includes(x.factor))).toBe(true);
  });

  it('confidence score scales with strength and sample size', () => {
    const low = confidenceScore({ sampleSize: 5, strength: 0.1, stability: 0.5 });
    const high = confidenceScore({ sampleSize: 30, strength: 0.8, stability: 1 });

    expect(high).toBeGreaterThan(low);
  });
});
