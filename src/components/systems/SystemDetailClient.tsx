'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readStringArray, writeStringArray } from '@/lib/state/local-storage';
import type { StarterSystem } from '@/types/domain';

type Props = {
  system: StarterSystem;
};

export function SystemDetailClient({ system }: Props) {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activate = async () => {
    setIsLoading(true);
    setInfo(null);
    setError(null);

    const response = await fetch('/api/systems/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId: system.id, includeOptional: false })
    });

    setIsLoading(false);

    if (!response.ok) {
      setError(uiCopy.systemDetail.activateError);
      return;
    }

    const active = readStringArray(STORAGE_KEYS.activeSystems);
    const next = [system.id, ...active.filter((id) => id !== system.id)].slice(0, 2);
    writeStringArray(STORAGE_KEYS.activeSystems, next);

    setInfo(uiCopy.systemDetail.activated);
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner
          tone={error ? 'danger' : 'success'}
          title={error ? uiCopy.systemDetail.bannerProblem : uiCopy.systemDetail.bannerStatus}
        >
          {error ?? info}
        </Banner>
      )}

      <Card tone="elevated" title={system.name} subtitle={uiCopy.systemDetail.impactSubtitle}>
        <p>{system.outcome}</p>
      </Card>

      <Card tone="elevated" title={uiCopy.systemDetail.coreTitle} subtitle={uiCopy.systemDetail.coreSubtitle}>
        <div className="stack">
          {system.coreSignals.map((signal) => (
            <Card key={signal.name} subtitle={`${uiCopy.systemDetail.cadencePrefix} ${signal.cadence}`} title={signal.name}>
              <small>{signal.definition}</small>
            </Card>
          ))}
        </div>
      </Card>

      <Card tone="default" title={uiCopy.systemDetail.advancedTitle} subtitle={uiCopy.systemDetail.advancedSubtitle}>
        <div className="stack">
          {system.advancedSignals.map((signal) => (
            <Card key={signal.name} subtitle={`${uiCopy.systemDetail.cadencePrefix} ${signal.cadence}`} title={signal.name}>
              <small>{signal.definition}</small>
            </Card>
          ))}
        </div>
      </Card>

      <div className="inline-actions">
        <Button onClick={() => void activate()} size="lg" variant="primary" disabled={isLoading}>
          {isLoading ? uiCopy.systemDetail.activateLoading : uiCopy.systemDetail.activateButton}
        </Button>
        <Link className="inline-link" href={`/systems/${system.id}/tune`}>
          {uiCopy.systemDetail.tuneLink}
        </Link>
      </div>
    </div>
  );
}
