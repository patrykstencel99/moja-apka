import { TutorialEventType, TutorialState } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { canCompleteTutorial } from '@/lib/tutorial/engine';
import { createTutorialEvent, getTutorialContext, toTutorialStateDto } from '@/lib/tutorial/server';

const bodySchema = z.object({
  route: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.tutorial.invalidCompletePayload, 400);
    }

    const context = await getTutorialContext(user.id);

    if (!context.enabled || !context.inRollout || !context.progress) {
      return jsonError(apiCopy.tutorial.notEligible, 403);
    }

    if (context.progress.state === TutorialState.COMPLETED) {
      return NextResponse.json(toTutorialStateDto(context));
    }

    if (!canCompleteTutorial(context.completedStepIds, context.definition)) {
      return jsonError(apiCopy.tutorial.coreNotCompleted, 409);
    }

    const finalStepId = context.definition.steps[context.definition.steps.length - 1]?.id;
    const completedStepIds = Array.from(new Set([...context.completedStepIds, ...(finalStepId ? [finalStepId] : [])]));

    await prisma.$transaction(async (tx) => {
      await tx.tutorialProgress.update({
        where: {
          userId: user.id
        },
        data: {
          state: TutorialState.COMPLETED,
          completedAt: new Date(),
          currentStepId: null,
          completedStepIds
        }
      });

      await createTutorialEvent(tx, {
        userId: user.id,
        tutorialKey: context.tutorialKey,
        version: context.version,
        eventType: TutorialEventType.COMPLETED,
        stepId: finalStepId ?? null,
        route: parsed.data.route
      });
    });

    const updatedContext = await getTutorialContext(user.id);
    return NextResponse.json(toTutorialStateDto(updatedContext));
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}
