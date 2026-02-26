export const INTUITION_TUTORIAL_KEY = 'intuicja_core';

export const INTUITION_STEPS_V1 = [
  'core_v1_01_intro_today',
  'core_v1_02_first_checkin',
  'core_v1_03_go_systems',
  'core_v1_04_activate_system',
  'core_v1_05_go_review',
  'core_v1_06_review_loaded',
  'core_v1_07_complete'
] as const;

export type TutorialStepId = (typeof INTUITION_STEPS_V1)[number];

export type TutorialStepKind = 'manual' | 'event' | 'route' | 'terminal';

export type TutorialStepConfig = {
  id: TutorialStepId;
  kind: TutorialStepKind;
  title: string;
  description: string;
  route?: string;
  ctaLabel?: string;
};

export type TutorialDefinition = {
  tutorialKey: string;
  version: number;
  steps: readonly TutorialStepConfig[];
  completionGuard: readonly TutorialStepId[];
};

const STEPS_V1: readonly TutorialStepConfig[] = [
  {
    id: 'core_v1_01_intro_today',
    kind: 'manual',
    route: '/today',
    title: 'Intuicja: zaczynamy od dzisiaj',
    description: 'Zrob jeden check-in i potraktuj go jak sygnal, nie ocene.',
    ctaLabel: 'Dalej'
  },
  {
    id: 'core_v1_02_first_checkin',
    kind: 'event',
    route: '/today',
    title: 'Krok 1: pierwszy check-in',
    description: 'Ustaw nastroj, energie i zapisz check-in. To zamyka dzisiejszy punkt startu.'
  },
  {
    id: 'core_v1_03_go_systems',
    kind: 'route',
    route: '/systems',
    title: 'Krok 2: przejdz do Systemow',
    description: 'Otworz sekcje Systemy. Zaraz aktywujesz pierwszy system.'
  },
  {
    id: 'core_v1_04_activate_system',
    kind: 'event',
    route: '/systems',
    title: 'Krok 3: aktywuj system',
    description: 'Aktywuj jeden system. Wystarczy wersja podstawowa.'
  },
  {
    id: 'core_v1_05_go_review',
    kind: 'route',
    route: '/review',
    title: 'Krok 4: przejdz do Przegladu',
    description: 'Otworz Przeglad, aby potwierdzic petle Today -> Systems -> Review.'
  },
  {
    id: 'core_v1_06_review_loaded',
    kind: 'event',
    route: '/review',
    title: 'Krok 5: zaladuj raport',
    description: 'Poczekaj na poprawne zaladowanie raportu tygodniowego i miesiecznego.'
  },
  {
    id: 'core_v1_07_complete',
    kind: 'terminal',
    route: '/review',
    title: 'Petla zamknieta',
    description: 'Masz komplet. Zakoncz samouczek i przejdz w normalny rytm pracy.',
    ctaLabel: 'Zakoncz'
  }
];

export const TUTORIAL_DEFINITIONS: Record<number, TutorialDefinition> = {
  1: {
    tutorialKey: INTUITION_TUTORIAL_KEY,
    version: 1,
    steps: STEPS_V1,
    completionGuard: [
      'core_v1_02_first_checkin',
      'core_v1_04_activate_system',
      'core_v1_06_review_loaded'
    ]
  }
};

export const DEFAULT_TUTORIAL_VERSION = 1;

export const TUTORIAL_CLIENT_EVENTS = {
  checkinSaved: 'pf:tutorial-checkin-saved',
  systemActivated: 'pf:tutorial-system-activated',
  reviewLoaded: 'pf:tutorial-review-loaded'
} as const;

export function getTutorialDefinition(version: number): TutorialDefinition {
  return TUTORIAL_DEFINITIONS[version] ?? TUTORIAL_DEFINITIONS[DEFAULT_TUTORIAL_VERSION];
}

export function isTutorialStepId(value: string, definition: TutorialDefinition): value is TutorialStepId {
  return definition.steps.some((step) => step.id === value);
}

export function getTutorialStep(stepId: TutorialStepId, definition: TutorialDefinition): TutorialStepConfig {
  const step = definition.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new Error('TUTORIAL_STEP_NOT_FOUND');
  }

  return step;
}
