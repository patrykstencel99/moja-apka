'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { IntuitionCompanion } from '@/components/tutorial/IntuitionCompanion';
import { uiCopy } from '@/lib/copy';
import { getTutorialDefinition, TUTORIAL_CLIENT_EVENTS, type TutorialStepConfig } from '@/lib/tutorial/config';
import { TUTORIAL_LOCAL_CACHE_KEY, type TutorialStateDto } from '@/lib/tutorial/types';

type TutorialContextValue = {
  state: TutorialStateDto | null;
  currentStep: TutorialStepConfig | null;
  isVisible: boolean;
  busy: boolean;
  info: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  advance: () => Promise<void>;
  skipAll: () => Promise<void>;
  remindLater: () => Promise<void>;
  restartFromSettings: () => Promise<boolean>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TRACKED_ROUTES = new Set(['/today', '/systems', '/review', '/settings']);

type TutorialStateCache = {
  state: TutorialStateDto;
  cachedAt: string;
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

function readCachedState(): TutorialStateDto | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TUTORIAL_LOCAL_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as TutorialStateCache;
    if (!parsed?.state || typeof parsed.state !== 'object') {
      return null;
    }

    return parsed.state;
  } catch {
    return null;
  }
}

function writeCachedState(state: TutorialStateDto) {
  if (!canUseStorage()) {
    return;
  }

  const payload: TutorialStateCache = {
    state,
    cachedAt: new Date().toISOString()
  };

  window.localStorage.setItem(TUTORIAL_LOCAL_CACHE_KEY, JSON.stringify(payload));
}

async function parseTutorialResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as TutorialStateDto | { error?: string } | null;
  return payload;
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<TutorialStateDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stepActionRef = useRef<string | null>(null);
  const autoStartRef = useRef(false);

  const trackedRoute = TRACKED_ROUTES.has(pathname);

  useEffect(() => {
    const cached = readCachedState();
    if (cached) {
      setState(cached);
    }
  }, []);

  const applyState = useCallback((nextState: TutorialStateDto) => {
    setState(nextState);
    writeCachedState(nextState);
  }, []);

  const refresh = useCallback(async () => {
    if (!trackedRoute) {
      return;
    }

    const response = await fetch('/api/tutorial/state', { cache: 'no-store' });
    if (response.status === 401) {
      setState(null);
      return;
    }

    if (!response.ok) {
      return;
    }

    const payload = await parseTutorialResponse(response);
    if (payload && 'state' in payload) {
      applyState(payload);
    }
  }, [applyState, trackedRoute]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const postStateMutation = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const payload = await parseTutorialResponse(response);

      if (!response.ok) {
        const nextError = payload && 'error' in payload ? payload.error : null;
        setError(nextError ?? 'Nie udalo sie zapisac stanu samouczka.');
        return null;
      }

      if (payload && 'state' in payload) {
        applyState(payload);
      }

      setError(null);
      return payload;
    },
    [applyState]
  );

  useEffect(() => {
    if (!state || !trackedRoute) {
      return;
    }

    if (pathname !== '/today' || !state.enabled || !state.eligible || state.state !== 'NOT_STARTED' || autoStartRef.current) {
      return;
    }

    autoStartRef.current = true;

    void (async () => {
      setBusy(true);
      try {
        const result = await postStateMutation('/api/tutorial/start', { source: 'auto' });
        if (!result) {
          autoStartRef.current = false;
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [pathname, postStateMutation, state, trackedRoute]);

  const completeStep = useCallback(
    async (stepId: string, metadata?: Record<string, unknown>) => {
      if (!trackedRoute) {
        return;
      }

      const dedupeKey = `${stepId}:${pathname}`;
      if (stepActionRef.current === dedupeKey) {
        return;
      }

      stepActionRef.current = dedupeKey;

      await postStateMutation('/api/tutorial/step-complete', {
        stepId,
        route: pathname,
        metadata
      });

      stepActionRef.current = null;
    },
    [pathname, postStateMutation, trackedRoute]
  );

  useEffect(() => {
    if (!state || state.state !== 'IN_PROGRESS' || !state.currentStepId) {
      return;
    }

    const definition = getTutorialDefinition(state.version);
    const step = definition.steps.find((candidate) => candidate.id === state.currentStepId);

    if (!step || step.kind !== 'route') {
      return;
    }

    if (step.route !== pathname) {
      return;
    }

    void completeStep(step.id, { trigger: 'route' });
  }, [completeStep, pathname, state]);

  useEffect(() => {
    if (!state || state.state !== 'IN_PROGRESS') {
      return;
    }

    const onCheckinSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ route?: string }>).detail;
      void completeStep('core_v1_02_first_checkin', {
        trigger: 'event',
        route: detail?.route ?? pathname
      });
    };

    const onSystemActivated = (event: Event) => {
      const detail = (event as CustomEvent<{ route?: string; systemId?: string }>).detail;
      void completeStep('core_v1_04_activate_system', {
        trigger: 'event',
        route: detail?.route ?? pathname,
        systemId: detail?.systemId ?? null
      });
    };

    const onReviewLoaded = (event: Event) => {
      const detail = (event as CustomEvent<{ route?: string; period?: string }>).detail;
      void completeStep('core_v1_06_review_loaded', {
        trigger: 'event',
        route: detail?.route ?? pathname,
        period: detail?.period ?? 'week+month'
      });
    };

    window.addEventListener(TUTORIAL_CLIENT_EVENTS.checkinSaved, onCheckinSaved as EventListener);
    window.addEventListener(TUTORIAL_CLIENT_EVENTS.systemActivated, onSystemActivated as EventListener);
    window.addEventListener(TUTORIAL_CLIENT_EVENTS.reviewLoaded, onReviewLoaded as EventListener);

    return () => {
      window.removeEventListener(TUTORIAL_CLIENT_EVENTS.checkinSaved, onCheckinSaved as EventListener);
      window.removeEventListener(TUTORIAL_CLIENT_EVENTS.systemActivated, onSystemActivated as EventListener);
      window.removeEventListener(TUTORIAL_CLIENT_EVENTS.reviewLoaded, onReviewLoaded as EventListener);
    };
  }, [completeStep, pathname, state]);

  const currentStep = useMemo(() => {
    if (!state?.currentStepId) {
      return null;
    }

    const definition = getTutorialDefinition(state.version);
    return definition.steps.find((candidate) => candidate.id === state.currentStepId) ?? null;
  }, [state]);

  const isVisible = Boolean(
    trackedRoute &&
      state?.enabled &&
      state?.eligible &&
      state?.state === 'IN_PROGRESS' &&
      currentStep &&
      (!currentStep.route || currentStep.route === pathname || currentStep.kind === 'route')
  );

  const advance = useCallback(async () => {
    if (!state || !currentStep) {
      return;
    }

    setBusy(true);
    try {
      if (currentStep.kind === 'event' || currentStep.kind === 'route') {
        setInfo(uiCopy.tutorial.waitingAction);
        return;
      }

      if (currentStep.kind === 'terminal') {
        await postStateMutation('/api/tutorial/complete', { route: pathname });
        setInfo(null);
        return;
      }

      await completeStep(currentStep.id, { trigger: 'manual' });
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }, [completeStep, currentStep, pathname, postStateMutation, state]);

  const skipAll = useCallback(async () => {
    setBusy(true);
    try {
      await postStateMutation('/api/tutorial/skip', { reason: 'close' });
      setInfo(uiCopy.tutorial.dismissBody);
    } finally {
      setBusy(false);
    }
  }, [postStateMutation]);

  const remindLater = useCallback(async () => {
    if (!state?.currentStepId) {
      return;
    }

    setBusy(true);
    try {
      await postStateMutation('/api/tutorial/skip', {
        stepId: state.currentStepId,
        reason: 'later'
      });
      setInfo(uiCopy.tutorial.remindBody);
    } finally {
      setBusy(false);
    }
  }, [postStateMutation, state?.currentStepId]);

  const restartFromSettings = useCallback(async () => {
    setBusy(true);
    try {
      const result = await postStateMutation('/api/tutorial/restart', {
        source: 'settings'
      });

      if (result) {
        setInfo(uiCopy.settings.tutorialRestarted);
        return true;
      }

      return false;
    } finally {
      setBusy(false);
    }
  }, [postStateMutation]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      state,
      currentStep,
      isVisible,
      busy,
      info,
      error,
      refresh,
      advance,
      skipAll,
      remindLater,
      restartFromSettings
    }),
    [advance, busy, currentStep, error, info, isVisible, refresh, remindLater, restartFromSettings, skipAll, state]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <IntuitionCompanion />
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }

  return context;
}
