import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { getLeaderboard, resolveCompetitionMetric, resolveCompetitionPeriod } from '@/lib/competition';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);

    const url = new URL(request.url);
    const metric = resolveCompetitionMetric(url.searchParams.get('metric'));
    const period = resolveCompetitionPeriod(url.searchParams.get('period'));
    const limit = Number(url.searchParams.get('limit') ?? '100');

    const payload = await getLeaderboard({
      metric,
      period,
      limit,
      userId: user.id
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.competition.leaderboardFailed, 500);
  }
}
