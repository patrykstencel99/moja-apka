import { Prisma, TutorialEventType, TutorialState, type TutorialProgress } from '@prisma/client';

import {
  getTutorialDefinition,
  isTutorialStepId,
  type TutorialDefinition,
  type TutorialStepId
} from '@/lib/tutorial/config';
import {
  normalizeCompletedStepIds,
  resolveCurrentStepId,
  resolveVersionedProgress
} from '@/lib/tutorial/engine';
import {
  isTutorialFeatureEnabled,
  isUserInTutorialRollout,
  resolveTutorialVersion
} from '@/lib/tutorial/feature-flags';
import type { TutorialStateDto } from '@/lib/tutorial/types';
import { prisma } from '@/lib/prisma';

type DbLike = Prisma.TransactionClient | typeof prisma;

export type TutorialContext = {
  enabled: boolean;
  inRollout: boolean;
  eligible: boolean;
  tutorialKey: string;
  version: number;
  definition: TutorialDefinition;
  progress: TutorialProgress | null;
  completedStepIds: TutorialStepId[];
  currentStepId: TutorialStepId | null;
};

function resolveState(progress: TutorialProgress, completedStepIds: TutorialStepId[]): TutorialState {
  if (progress.state === TutorialState.COMPLETED) {
    return TutorialState.COMPLETED;
  }

  if (progress.state === TutorialState.SKIPPED) {
    return TutorialState.SKIPPED;
  }

  return completedStepIds.length > 0 ? TutorialState.IN_PROGRESS : TutorialState.NOT_STARTED;
}

function asStepId(value: string | null, definition: TutorialDefinition): TutorialStepId | null {
  if (!value) {
    return null;
  }

  if (!isTutorialStepId(value, definition)) {
    return null;
  }

  return value;
}

function rawCompletedFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function isJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every((item) => isJsonValue(item));
  }

  return false;
}

export async function getTutorialContext(userId: string): Promise<TutorialContext> {
  const enabled = isTutorialFeatureEnabled();
  const inRollout = isUserInTutorialRollout(userId);
  const version = resolveTutorialVersion();
  const definition = getTutorialDefinition(version);

  let progress = await prisma.tutorialProgress.findUnique({
    where: {
      userId
    }
  });

  if (progress && (progress.version !== version || progress.tutorialKey !== definition.tutorialKey)) {
    const migrated = resolveVersionedProgress({
      fromVersion: progress.version,
      toVersion: version,
      previousState: progress.state,
      previousCompletedStepIds: progress.completedStepIds
    });

    progress = await prisma.tutorialProgress.update({
      where: {
        userId
      },
      data: {
        tutorialKey: definition.tutorialKey,
        version,
        state: migrated.state,
        completedStepIds: migrated.completedStepIds,
        currentStepId: migrated.currentStepId,
        completedAt: migrated.state === TutorialState.COMPLETED ? progress.completedAt ?? new Date() : null
      }
    });
  }

  if (!progress && enabled && inRollout) {
    progress = await prisma.tutorialProgress.create({
      data: {
        userId,
        tutorialKey: definition.tutorialKey,
        version,
        state: TutorialState.NOT_STARTED,
        completedStepIds: [],
        currentStepId: definition.steps[0]?.id ?? null
      }
    });
  }

  if (!progress) {
    return {
      enabled,
      inRollout,
      eligible: false,
      tutorialKey: definition.tutorialKey,
      version,
      definition,
      progress: null,
      completedStepIds: [],
      currentStepId: definition.steps[0]?.id ?? null
    };
  }

  let completedStepIds = normalizeCompletedStepIds(progress.completedStepIds, definition);
  let currentStepId = asStepId(progress.currentStepId, definition) ?? resolveCurrentStepId(completedStepIds, definition);
  const resolvedState = resolveState(progress, completedStepIds);
  const rawCompletedStepIds = rawCompletedFromJson(progress.completedStepIds);
  const hasCompletedMismatch =
    rawCompletedStepIds.length !== completedStepIds.length ||
    rawCompletedStepIds.some((stepId, index) => stepId !== completedStepIds[index]);

  const shouldPersistProgress =
    resolvedState !== progress.state ||
    currentStepId !== progress.currentStepId ||
    hasCompletedMismatch;

  if (shouldPersistProgress) {
    progress = await prisma.tutorialProgress.update({
      where: {
        userId
      },
      data: {
        state: resolvedState,
        currentStepId,
        completedStepIds,
        completedAt: resolvedState === TutorialState.COMPLETED ? progress.completedAt ?? new Date() : null
      }
    });

    completedStepIds = normalizeCompletedStepIds(progress.completedStepIds, definition);
    currentStepId = asStepId(progress.currentStepId, definition) ?? resolveCurrentStepId(completedStepIds, definition);
  }

  const rolloutBypass = progress.state === TutorialState.IN_PROGRESS;
  const eligible =
    enabled &&
    (inRollout || rolloutBypass) &&
    progress.state !== TutorialState.COMPLETED &&
    progress.state !== TutorialState.SKIPPED;

  return {
    enabled,
    inRollout,
    eligible,
    tutorialKey: definition.tutorialKey,
    version,
    definition,
    progress,
    completedStepIds,
    currentStepId
  };
}

export function toTutorialStateDto(context: TutorialContext): TutorialStateDto {
  return {
    enabled: context.enabled,
    eligible: context.eligible,
    tutorialKey: context.tutorialKey,
    version: context.version,
    state: context.progress?.state ?? TutorialState.NOT_STARTED,
    currentStepId: context.currentStepId,
    completedStepIds: context.completedStepIds,
    startedAt: context.progress?.startedAt?.toISOString() ?? null,
    completedAt: context.progress?.completedAt?.toISOString() ?? null
  };
}

export async function createTutorialEvent(
  db: DbLike,
  input: {
    userId: string;
    tutorialKey: string;
    version: number;
    eventType: TutorialEventType;
    stepId?: string | null;
    route?: string | null;
    metadata?: unknown;
  }
) {
  const metadata = isJsonValue(input.metadata) ? input.metadata : undefined;

  await db.tutorialEvent.create({
    data: {
      userId: input.userId,
      tutorialKey: input.tutorialKey,
      version: input.version,
      eventType: input.eventType,
      stepId: input.stepId ?? null,
      route: input.route ?? null,
      metadata
    }
  });
}

export function assertActiveProgress(context: TutorialContext) {
  if (!context.progress) {
    throw new Error('TUTORIAL_PROGRESS_NOT_FOUND');
  }

  return context.progress;
}
