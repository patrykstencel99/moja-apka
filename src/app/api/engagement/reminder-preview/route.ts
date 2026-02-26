import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { buildReminderCopy, resolveLocalDateForUser } from '@/lib/engagement';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  userId: z.string().min(1).optional(),
  reminderType: z.enum(['SLOT_REMINDER', 'COMEBACK']).optional(),
  missingSlot: z.enum(['SLOT_1', 'SLOT_2']).nullable().optional(),
  microStep: z.string().trim().max(240).nullable().optional(),
  rankDeltaToday: z.number().int().optional()
});

function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const allowList = (process.env.ENGAGEMENT_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowList.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireApiUser(request);
    if (process.env.NODE_ENV === 'production' && !isAdminEmail(currentUser.email)) {
      return jsonError('Podglad remindera dostepny tylko dla admina.', 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawny payload preview remindera.', 400);
    }

    const targetUser = parsed.data.userId
      ? await prisma.user.findUnique({
          where: {
            id: parsed.data.userId
          }
        })
      : currentUser;

    if (!targetUser) {
      return jsonError('Nie znaleziono uzytkownika.', 404);
    }

    const localDate = resolveLocalDateForUser(new Date(), targetUser.timezone);

    const todayState = await prisma.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: targetUser.id,
          localDate
        }
      }
    });

    const missingSlot =
      parsed.data.missingSlot ?? (!todayState?.slot1Done ? 'SLOT_1' : !todayState?.slot2Done ? 'SLOT_2' : null);

    const reminderType =
      parsed.data.reminderType ??
      (todayState?.slot1Done || todayState?.slot2Done ? 'SLOT_REMINDER' : ('COMEBACK' as const));

    const copy = buildReminderCopy({
      reminderType,
      missingSlot,
      microStep: parsed.data.microStep ?? todayState?.nextMicroStep ?? null,
      rankDeltaToday: parsed.data.rankDeltaToday ?? 0
    });

    return NextResponse.json({
      previewForUserId: targetUser.id,
      localDate,
      reminderType,
      missingSlot,
      payload: {
        title: copy.title,
        body: copy.body,
        url: '/today'
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError('Nie udalo sie wygenerowac preview remindera.', 500);
  }
}
