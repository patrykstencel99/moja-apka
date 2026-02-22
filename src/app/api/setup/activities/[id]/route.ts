import { ActivityType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { decorateActivity } from '@/lib/activity-meta';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { activityUpdateSchema } from '@/lib/validators';

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const parsed = activityUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawne dane', 400);
    }

    const existing = await prisma.activityDefinition.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!existing) {
      return jsonError('Nie znaleziono aktywnosci', 404);
    }

    const activity = await prisma.activityDefinition.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        type:
          parsed.data.type === undefined
            ? undefined
            : parsed.data.type === 'BOOLEAN'
              ? ActivityType.BOOLEAN
              : ActivityType.NUMERIC_0_10,
        archivedAt:
          parsed.data.archived === undefined ? undefined : parsed.data.archived ? new Date() : null
      }
    });

    return NextResponse.json({ activity: decorateActivity(activity) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Blad aktualizacji aktywnosci', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await requireApiUser(request);

    const existing = await prisma.activityDefinition.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!existing) {
      return jsonError('Nie znaleziono aktywnosci', 404);
    }

    await prisma.activityDefinition.update({
      where: { id: params.id },
      data: { archivedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Blad usuwania aktywnosci', 500);
  }
}
