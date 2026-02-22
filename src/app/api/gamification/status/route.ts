import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { getGamificationStatus } from '@/lib/gamification';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const status = await getGamificationStatus(user.id);

    return NextResponse.json({
      ...status,
      leaderboard: {
        bestStreak: status.bestStreak,
        totalCheckIns: status.totalCheckIns,
        avgEntriesPerDay: status.avgEntriesPerDay
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Nie udalo sie pobrac statusu grywalizacji', 500);
  }
}
