export type TutorialStateValue = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type TutorialEventTypeValue =
  | 'STARTED'
  | 'STEP_SHOWN'
  | 'STEP_COMPLETED'
  | 'SKIPPED'
  | 'COMPLETED'
  | 'RESTARTED';

export type TutorialSkipReason = 'later' | 'close' | 'not_now';

export type TutorialSource = 'auto' | 'manual' | 'settings';

export type TutorialStateDto = {
  enabled: boolean;
  eligible: boolean;
  tutorialKey: string;
  version: number;
  state: TutorialStateValue;
  currentStepId: string | null;
  completedStepIds: string[];
  startedAt: string | null;
  completedAt: string | null;
};

export const TUTORIAL_LOCAL_CACHE_KEY = 'pf_tutorial_state_v1';
