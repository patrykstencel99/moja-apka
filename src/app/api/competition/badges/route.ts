import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { getUserBadgeProgress } from '@/lib/competition';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const badges = await getUserBadgeProgress(user.id);

    return NextResponse.json({ badges });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.competition.badgesFailed, 500);
  }
}
