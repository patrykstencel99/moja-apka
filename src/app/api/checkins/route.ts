import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { decorateActivity } from '@/lib/activity-meta';
import { apiCopy } from '@/lib/copy';
import { formatLocalDate } from '@/lib/date';
import { updateGamificationAfterCheckIn } from '@/lib/gamification';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { checkInSchema } from '@/lib/validators';

function parseDateRange(url: URL) {
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
    const range = parseDateRange(new URL(request.url));

    if (!range) {
      return jsonError(apiCopy.checkins.invalidRange, 400);
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: user.id,
        localDate: {
          gte: range.from,
          lte: range.to
        }
      },
      orderBy: [{ createdAt: 'asc' }],
      include: {
        values: {
          include: {
            activity: true
          }
        }
      }
    });

    const todayLocal = formatLocalDate(new Date(), user.timezone);
    const hasTodayEntry = checkIns.some((c) => c.localDate === todayLocal);

    return NextResponse.json({
      checkIns: checkIns.map((checkIn) => ({
        ...checkIn,
        values: checkIn.values.map((value) => ({
          ...value,
          activity: decorateActivity(value.activity)
        }))
      })),
      hasTodayEntry,
      todayLocalDate: todayLocal
    });
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.checkins.invalidPayload, 400);
    }

    const payload = parsed.data;
    const createdAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const localDate = payload.localDate ?? formatLocalDate(createdAt, user.timezone);

    const activityIds = [...new Set(payload.values.map((v) => v.activityId))];
    const activities = await prisma.activityDefinition.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
        id: { in: activityIds }
      }
    });

    if (activities.length !== activityIds.length) {
      return jsonError(apiCopy.checkins.invalidActivities, 400);
    }

    const activityMap = new Map(activities.map((a) => [a.id, a]));

    const existing =
      payload.clientEventId &&
      (await prisma.checkIn.findFirst({
        where: {
          userId: user.id,
          clientEventId: payload.clientEventId
        }
      }));

    if (existing) {
      return NextResponse.json({ deduplicated: true, checkIn: existing });
    }

    const checkIn = await prisma.$transaction(async (tx) => {
      const created = await tx.checkIn.create({
        data: {
          userId: user.id,
          createdAt,
          localDate,
          mood: payload.mood,
          energy: payload.energy,
          journal: payload.journal,
          clientEventId: payload.clientEventId
        }
      });

      if (payload.values.length > 0) {
        await tx.checkInActivityValue.createMany({
          data: payload.values.map((value) => {
            const activity = activityMap.get(value.activityId);
            if (!activity) {
              throw new Error('INVALID_ACTIVITY');
            }

            if (activity.type === 'BOOLEAN') {
              return {
                checkInId: created.id,
                activityId: value.activityId,
                booleanValue: value.booleanValue ?? false,
                numericValue: null
              };
            }

            return {
              checkInId: created.id,
              activityId: value.activityId,
              booleanValue: null,
              numericValue: value.numericValue ?? 0
            };
          })
        });
      }

      return created;
    });

    await updateGamificationAfterCheckIn({
      userId: user.id,
      localDate,
      createdAt,
      userTimeZone: user.timezone
    });

    if (!user.onboardingComplete) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          onboardingComplete: true
        }
      });
    }

    return NextResponse.json(
      {
        checkIn,
        activityMetadata: activities.map((activity) => decorateActivity(activity))
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ deduplicated: true }, { status: 200 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.checkins.saveFailed, 500);
  }
}
