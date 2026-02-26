import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { listDuelHistory } from '@/lib/fun';
import { jsonError } from '@/lib/http';

function parseLimit(url: URL): number {
  const raw = url.searchParams.get('limit');
  if (!raw) {
    return 120;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 120;
  }
  return Math.max(1, Math.min(300, Math.trunc(parsed)));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const limit = parseLimit(new URL(request.url));
    const duels = await listDuelHistory({
      userId: user.id,
      limit
    });

    return NextResponse.json({ duels });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    return jsonError('Nie udalo sie pobrac historii duelow.', 500);
  }
}

