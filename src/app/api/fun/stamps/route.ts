import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { listStamps } from '@/lib/fun';
import { jsonError } from '@/lib/http';

function parseRange(url: URL) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from || !to) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return null;
  }

  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const range = parseRange(new URL(request.url));
    if (!range) {
      return jsonError('Niepoprawny zakres dat stampow.', 400);
    }

    const payload = await listStamps({
      userId: user.id,
      from: range.from,
      to: range.to
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    return jsonError('Nie udalo sie pobrac stampow.', 500);
  }
}

