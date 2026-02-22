import { addDays, format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { buildInsightsReport } from '@/lib/insights';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { weekStartFromIso } from '@/lib/date';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const week = new URL(request.url).searchParams.get('week');

    if (!week || !/^\d{4}-\d{2}$/.test(week)) {
      return jsonError('Podaj week=YYYY-WW', 400);
    }

    const [yearStr, weekStr] = week.split('-');
    const year = Number(yearStr);
    const weekNo = Number(weekStr);

    const start = weekStartFromIso(year, weekNo);
    const end = addDays(start, 6);

    const from = format(start, 'yyyy-MM-dd');
    const to = format(end, 'yyyy-MM-dd');

    const checkins = await prisma.checkIn.findMany({
      where: {
        userId: user.id,
        localDate: {
          gte: from,
          lte: to
        }
      },
      include: {
        values: {
          include: {
            activity: true
          }
        }
      }
    });

    const report = buildInsightsReport({
      checkins,
      window: 'weekly',
      from,
      to
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Nie udalo sie pobrac raportu tygodniowego', 500);
  }
}
