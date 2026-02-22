import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { buildInsightsReport } from '@/lib/insights';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const month = new URL(request.url).searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return jsonError('Podaj month=YYYY-MM', 400);
    }

    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);

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
      window: 'monthly',
      from,
      to
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Nie udalo sie pobrac raportu miesiecznego', 500);
  }
}
