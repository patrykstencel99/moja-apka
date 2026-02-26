import { TutorialEventType, TutorialState } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { createTutorialEvent, getTutorialContext, toTutorialStateDto } from '@/lib/tutorial/server';

const bodySchema = z.object({
  source: z.literal('settings')
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.tutorial.invalidRestartPayload, 400);
    }

    const context = await getTutorialContext(user.id);

    if (!context.enabled || !context.inRollout || !context.progress) {
      return jsonError(apiCopy.tutorial.notEligible, 403);
    }

    const firstStepId = context.definition.steps[0]?.id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.tutorialProgress.update({
        where: {
          userId: user.id
        },
        data: {
          state: TutorialState.IN_PROGRESS,
          currentStepId: firstStepId,
          completedStepIds: [],
          startedAt: new Date(),
          firstCheckinAt: null,
          completedAt: null
        }
      });

      await createTutorialEvent(tx, {
        userId: user.id,
        tutorialKey: context.tutorialKey,
        version: context.version,
        eventType: TutorialEventType.RESTARTED,
        route: '/settings',
        metadata: {
          source: parsed.data.source
        }
      });

      await createTutorialEvent(tx, {
        userId: user.id,
        tutorialKey: context.tutorialKey,
        version: context.version,
        eventType: TutorialEventType.STARTED,
        route: '/settings',
        metadata: {
          source: 'manual-restart'
        }
      });

      if (firstStepId) {
        await createTutorialEvent(tx, {
          userId: user.id,
          tutorialKey: context.tutorialKey,
          version: context.version,
          eventType: TutorialEventType.STEP_SHOWN,
          stepId: firstStepId,
          route: '/settings'
        });
      }
    });

    const updatedContext = await getTutorialContext(user.id);
    return NextResponse.json(toTutorialStateDto(updatedContext));
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}
