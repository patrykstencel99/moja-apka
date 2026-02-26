import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { formatLocalDate } from '@/lib/date';
import { getTodayFunState } from '@/lib/fun';
import { jsonError } from '@/lib/http';

function resolveDateParam(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const todayLocalDate = formatLocalDate(new Date(), user.timezone);
    const date = resolveDateParam(new URL(request.url).searchParams.get('date'), todayLocalDate);

    const payload = await getTodayFunState({
      user,
      localDate: date
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    return jsonError('Nie udalo sie pobrac stanu fun.', 500);
  }
}

