import { TutorialEventType, TutorialState } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { createTutorialEvent, getTutorialContext, toTutorialStateDto } from '@/lib/tutorial/server';

const bodySchema = z.object({
  source: z.enum(['auto', 'manual'])
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.tutorial.invalidStartPayload, 400);
    }

    const context = await getTutorialContext(user.id);

    if (!context.enabled || !context.inRollout || !context.progress) {
      return jsonError(apiCopy.tutorial.notEligible, 403);
    }

    if (context.progress.state === TutorialState.COMPLETED) {
      return NextResponse.json(toTutorialStateDto(context));
    }

    if (context.progress.state === TutorialState.SKIPPED && parsed.data.source === 'auto') {
      return NextResponse.json(toTutorialStateDto(context));
    }

    if (context.progress.state === TutorialState.IN_PROGRESS) {
      return NextResponse.json(toTutorialStateDto(context));
    }

    const currentStepId = context.currentStepId ?? context.definition.steps[0]?.id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.tutorialProgress.update({
        where: {
          userId: user.id
        },
        data: {
          state: TutorialState.IN_PROGRESS,
          startedAt: context.progress?.startedAt ?? new Date(),
          currentStepId,
          completedAt: null
        }
      });

      await createTutorialEvent(tx, {
        userId: user.id,
        tutorialKey: context.tutorialKey,
        version: context.version,
        eventType: TutorialEventType.STARTED,
        route: '/today',
        metadata: {
          source: parsed.data.source
        }
      });

      if (currentStepId) {
        await createTutorialEvent(tx, {
          userId: user.id,
          tutorialKey: context.tutorialKey,
          version: context.version,
          eventType: TutorialEventType.STEP_SHOWN,
          stepId: currentStepId,
          route: '/today'
        });
      }
    });

    const updatedContext = await getTutorialContext(user.id);
    return NextResponse.json(toTutorialStateDto(updatedContext));
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}
