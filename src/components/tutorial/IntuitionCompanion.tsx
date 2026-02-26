'use client';

import { Button } from '@/components/ui/Button';
import { uiCopy } from '@/lib/copy';
import { getTutorialDefinition } from '@/lib/tutorial/config';

import { useTutorial } from './TutorialProvider';

export function IntuitionCompanion() {
  const { state, currentStep, isVisible, busy, info, error, advance, skipAll, remindLater } = useTutorial();

  if (!isVisible || !state || !currentStep) {
    return null;
  }

  const definition = getTutorialDefinition(state.version);
  const stepIndex = definition.steps.findIndex((step) => step.id === currentStep.id);
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : 1;

  return (
    <aside aria-live="polite" className="tutorial-companion" data-tutorial-id="intuition-companion" role="status">
      <div className="tutorial-companion__header">
        <span className="tutorial-companion__badge">{uiCopy.tutorial.badge}</span>
        <span className="tutorial-companion__progress">
          {uiCopy.tutorial.progressPrefix} {stepNumber}/{definition.steps.length}
        </span>
      </div>

      <h3>{currentStep.title}</h3>
      <p>{currentStep.description}</p>

      {info && <small>{info}</small>}
      {error && <small className="tutorial-companion__error">{error}</small>}

      <div className="tutorial-companion__actions">
        <Button disabled={busy} onClick={() => void advance()} size="sm" variant="primary">
          {busy ? '...' : currentStep.ctaLabel ?? uiCopy.tutorial.continueButton}
        </Button>
        <Button disabled={busy} onClick={() => void remindLater()} size="sm" variant="ghost">
          {uiCopy.tutorial.remindLaterButton}
        </Button>
        <Button disabled={busy} onClick={() => void skipAll()} size="sm" variant="ghost">
          {uiCopy.tutorial.skipAllButton}
        </Button>
      </div>
    </aside>
  );
}
