import { TutorialEventType, TutorialState } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { isTutorialStepId } from '@/lib/tutorial/config';
import { resolveCurrentStepId } from '@/lib/tutorial/engine';
import { createTutorialEvent, getTutorialContext, toTutorialStateDto } from '@/lib/tutorial/server';

const bodySchema = z.object({
  stepId: z.string().min(1),
  route: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.tutorial.invalidStepPayload, 400);
    }

    const context = await getTutorialContext(user.id);
    if (!context.enabled || !context.inRollout || !context.progress) {
      return jsonError(apiCopy.tutorial.notEligible, 403);
    }

    if (context.progress.state === TutorialState.COMPLETED || context.progress.state === TutorialState.SKIPPED) {
      return NextResponse.json(toTutorialStateDto(context));
    }

    if (!isTutorialStepId(parsed.data.stepId, context.definition)) {
      return jsonError(apiCopy.tutorial.invalidStep, 400);
    }

    const stepOrder = context.definition.steps.map((step) => step.id);
    const targetIndex = stepOrder.findIndex((stepId) => stepId === parsed.data.stepId);

    if (targetIndex === -1) {
      return jsonError(apiCopy.tutorial.invalidStep, 400);
    }

    const nextCompletedSet = new Set(context.completedStepIds);
    for (let index = 0; index <= targetIndex; index += 1) {
      nextCompletedSet.add(stepOrder[index]);
    }

    const nextCompletedStepIds = Array.from(nextCompletedSet);

    if (nextCompletedStepIds.length === context.completedStepIds.length) {
      return NextResponse.json(toTutorialStateDto(context));
    }

    const nextStepId = resolveCurrentStepId(nextCompletedStepIds, context.definition);

    await prisma.$transaction(async (tx) => {
      await tx.tutorialProgress.update({
        where: {
          userId: user.id
        },
        data: {
          state: TutorialState.IN_PROGRESS,
          startedAt: context.progress?.startedAt ?? new Date(),
          currentStepId: nextStepId,
          completedStepIds: nextCompletedStepIds,
          firstCheckinAt:
            parsed.data.stepId === 'core_v1_02_first_checkin'
              ? context.progress?.firstCheckinAt ?? new Date()
              : context.progress?.firstCheckinAt ?? null,
          completedAt: null
        }
      });

      await createTutorialEvent(tx, {
        userId: user.id,
        tutorialKey: context.tutorialKey,
        version: context.version,
        eventType: TutorialEventType.STEP_COMPLETED,
        stepId: parsed.data.stepId,
        route: parsed.data.route,
        metadata: parsed.data.metadata
      });

      if (nextStepId) {
        await createTutorialEvent(tx, {
          userId: user.id,
          tutorialKey: context.tutorialKey,
          version: context.version,
          eventType: TutorialEventType.STEP_SHOWN,
          stepId: nextStepId,
          route: parsed.data.route
        });
      }
    });

    const updatedContext = await getTutorialContext(user.id);
    return NextResponse.json(toTutorialStateDto(updatedContext));
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}
