import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { getCompetitionMe, resolveCompetitionMetric, resolveCompetitionPeriod } from '@/lib/competition';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const url = new URL(request.url);

    const metric = resolveCompetitionMetric(url.searchParams.get('metric'));
    const period = resolveCompetitionPeriod(url.searchParams.get('period'));

    const payload = await getCompetitionMe({
      userId: user.id,
      metric,
      period
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.competition.meFailed, 500);
  }
}
