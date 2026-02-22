'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      setError('Nie udalo sie aktywowac systemu.');
      return;
    }

    const active = readStringArray(STORAGE_KEYS.activeSystems);
    const next = [system.id, ...active.filter((id) => id !== system.id)].slice(0, 2);
    writeStringArray(STORAGE_KEYS.activeSystems, next);

    setInfo('System aktywowany.');
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? 'Problem' : 'Status'}>
          {error ?? info}
        </Banner>
      )}

      <Card tone="elevated" title={system.name} subtitle="Co ten system stabilizuje">
        <p>{system.outcome}</p>
      </Card>

      <Card tone="elevated" title="Core sygnaly" subtitle="3 sygnaly bazowe z jasna definicja zaliczenia.">
        <div className="stack">
          {system.coreSignals.map((signal) => (
            <Card key={signal.name} subtitle={`Kiedy: ${signal.cadence}`} title={signal.name}>
              <small>{signal.definition}</small>
            </Card>
          ))}
        </div>
      </Card>

      <Card tone="default" title="Opcjonalne sygnaly" subtitle="2-4 sygnaly do rozszerzenia po 7 dniach.">
        <div className="stack">
          {system.advancedSignals.map((signal) => (
            <Card key={signal.name} subtitle={`Kiedy: ${signal.cadence}`} title={signal.name}>
              <small>{signal.definition}</small>
            </Card>
          ))}
        </div>
      </Card>

      <div className="inline-actions">
        <Button onClick={() => void activate()} size="lg" variant="primary" disabled={isLoading}>
          {isLoading ? 'Aktywacja...' : 'Aktywuj system'}
        </Button>
        <Link className="inline-link" href={`/systems/${system.id}/tune`}>
          Przejdz do dopracowania
        </Link>
      </div>
    </div>
  );
}
