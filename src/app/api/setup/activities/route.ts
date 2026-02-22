import { ActivityType, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { decorateActivity } from '@/lib/activity-meta';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { activitySchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);

    const activities = await prisma.activityDefinition.findMany({
      where: {
        userId: user.id,
        archivedAt: null
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    return NextResponse.json({ activities: activities.map((activity) => decorateActivity(activity)) });
  } catch {
    return jsonError('Unauthorized', 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawne dane aktywnosci', 400);
    }

    const activity = await prisma.activityDefinition.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        category: parsed.data.category,
        type: parsed.data.type === 'BOOLEAN' ? ActivityType.BOOLEAN : ActivityType.NUMERIC_0_10,
        isStarter: false
      }
    });

    return NextResponse.json({ activity: decorateActivity(activity) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return jsonError('Unauthorized', 401);
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('Aktywnosc o tej nazwie juz istnieje', 409);
    }

    return jsonError('Nie udalo sie zapisac aktywnosci', 500);
  }
}
