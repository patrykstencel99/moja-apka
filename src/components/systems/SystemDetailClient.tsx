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
  const [pendingMode, setPendingMode] = useState<'core' | 'advanced' | null>(null);

  const activate = async (includeOptional: boolean) => {
    if (pendingMode) {
      return;
    }

    setPendingMode(includeOptional ? 'advanced' : 'core');
    setInfo(null);
    setError(null);

    try {
      const response = await fetch('/api/systems/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: system.id, includeOptional })
      });

      if (!response.ok) {
        setError('Nie udalo sie aktywowac systemu.');
        return;
      }

      const active = readStringArray(STORAGE_KEYS.activeSystems);
      const next = [system.id, ...active.filter((id) => id !== system.id)].slice(0, 2);
      writeStringArray(STORAGE_KEYS.activeSystems, next);

      setInfo(includeOptional ? 'System aktywowany (core + advanced).' : 'System aktywowany (core).');
    } catch {
      setError('Nie udalo sie aktywowac systemu.');
    } finally {
      setPendingMode(null);
    }
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
        {system.coreSignals.length === 0 ? (
          <div className="empty-state">Brak sygnalow core w tym systemie.</div>
        ) : (
          <div className="stack">
            {system.coreSignals.map((signal) => (
              <Card key={signal.name} subtitle={`Kiedy: ${signal.cadence}`} title={signal.name}>
                <small>{signal.definition}</small>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card tone="default" title="Opcjonalne sygnaly" subtitle="2-4 sygnaly do rozszerzenia po 7 dniach.">
        {system.advancedSignals.length === 0 ? (
          <div className="empty-state">Brak sygnalow opcjonalnych w tym systemie.</div>
        ) : (
          <div className="stack">
            {system.advancedSignals.map((signal) => (
              <Card key={signal.name} subtitle={`Kiedy: ${signal.cadence}`} title={signal.name}>
                <small>{signal.definition}</small>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <div className="inline-actions">
        <Button onClick={() => void activate(false)} size="lg" variant="primary" disabled={pendingMode !== null}>
          {pendingMode === 'core' ? 'Aktywacja...' : 'Aktywuj core'}
        </Button>
        <Button onClick={() => void activate(true)} size="lg" variant="ghost" disabled={pendingMode !== null}>
          {pendingMode === 'advanced' ? 'Aktywacja...' : 'Aktywuj core + advanced'}
        </Button>
        <Link className="inline-link" href={`/systems/${system.id}/tune`}>
          Przejdz do dopracowania
        </Link>
      </div>
    </div>
  );
}
