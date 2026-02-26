import type { TutorialStateValue } from '@/lib/tutorial/types';
import { getTutorialDefinition, isTutorialStepId, type TutorialDefinition, type TutorialStepId } from '@/lib/tutorial/config';

function uniqueSteps(stepIds: TutorialStepId[]) {
  return Array.from(new Set(stepIds));
}

export function normalizeCompletedStepIds(rawValue: unknown, definition: TutorialDefinition): TutorialStepId[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return uniqueSteps(
    rawValue
      .filter((value): value is string => typeof value === 'string')
      .filter((value): value is TutorialStepId => isTutorialStepId(value, definition))
  );
}

export function resolveCurrentStepId(
  completedStepIds: TutorialStepId[],
  definition: TutorialDefinition
): TutorialStepId | null {
  const completed = new Set(completedStepIds);
  const next = definition.steps.find((step) => !completed.has(step.id));
  return next?.id ?? null;
}

export function withCompletedStep(
  completedStepIds: TutorialStepId[],
  stepId: TutorialStepId,
  definition: TutorialDefinition
): TutorialStepId[] {
  if (!isTutorialStepId(stepId, definition)) {
    return completedStepIds;
  }

  return uniqueSteps([...completedStepIds, stepId]);
}

export function canCompleteTutorial(completedStepIds: TutorialStepId[], definition: TutorialDefinition) {
  const completed = new Set(completedStepIds);
  return definition.completionGuard.every((requiredStepId) => completed.has(requiredStepId));
}

export function resolveVersionedProgress(input: {
  fromVersion: number;
  toVersion: number;
  previousState: TutorialStateValue;
  previousCompletedStepIds: unknown;
}) {
  const fromDefinition = getTutorialDefinition(input.fromVersion);
  const toDefinition = getTutorialDefinition(input.toVersion);

  const previousCompleted = normalizeCompletedStepIds(input.previousCompletedStepIds, fromDefinition);
  const carriedSteps = previousCompleted.filter((stepId) => toDefinition.steps.some((step) => step.id === stepId));

  const currentStepId = resolveCurrentStepId(carriedSteps, toDefinition);

  if (input.previousState === 'COMPLETED' && currentStepId === null) {
    return {
      state: 'COMPLETED' as const,
      completedStepIds: carriedSteps,
      currentStepId: null
    };
  }

  if (input.previousState === 'SKIPPED') {
    return {
      state: 'NOT_STARTED' as const,
      completedStepIds: [] as TutorialStepId[],
      currentStepId: toDefinition.steps[0]?.id ?? null
    };
  }

  if (carriedSteps.length === 0) {
    return {
      state: 'NOT_STARTED' as const,
      completedStepIds: [] as TutorialStepId[],
      currentStepId: toDefinition.steps[0]?.id ?? null
    };
  }

  return {
    state: 'IN_PROGRESS' as const,
    completedStepIds: carriedSteps,
    currentStepId
  };
}
