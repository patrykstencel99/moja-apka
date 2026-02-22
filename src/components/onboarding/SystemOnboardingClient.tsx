'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { STORAGE_KEYS, readStringArray, writeString, writeStringArray } from '@/lib/state/local-storage';
import type { StarterSystem } from '@/types/domain';

type Props = {
  systems: StarterSystem[];
};

export function SystemOnboardingClient({ systems }: Props) {
  const router = useRouter();
  const [selectedSystemId, setSelectedSystemId] = useState<string>(systems[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId) ?? null,
    [systems, selectedSystemId]
  );

  const activate = async () => {
    if (!selectedSystem) {
      setError('Wybierz system, aby kontynuowac.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/systems/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId: selectedSystem.id, includeOptional: false })
    });

    if (!response.ok) {
      setError('Nie udalo sie aktywowac systemu. Sprobuj ponownie.');
      setIsLoading(false);
      return;
    }

    writeString(STORAGE_KEYS.selectedSystem, selectedSystem.id);

    const activeSystems = readStringArray(STORAGE_KEYS.activeSystems);
    const deduped = [selectedSystem.id, ...activeSystems.filter((id) => id !== selectedSystem.id)].slice(0, 2);
    writeStringArray(STORAGE_KEYS.activeSystems, deduped);

    router.push('/onboarding/rhythm');
  };

  return (
    <section className="stack-lg">
      <header className="hero-header">
        <span className="eyebrow">Onboarding 1/3</span>
        <h1>Wybierz system startowy</h1>
        <p className="hero-support">Najpierw uruchamiamy jeden system. Potem doprecyzujesz sygnaly.</p>
      </header>

      {error && (
        <Banner tone="danger" title="Blad aktywacji">
          {error}
        </Banner>
      )}

      <div className="grid grid-3">
        {systems.map((system) => (
          <button
            className={['system-tile', selectedSystemId === system.id ? 'active' : ''].join(' ')}
            key={system.id}
            onClick={() => setSelectedSystemId(system.id)}
            type="button"
          >
            <strong>{system.name}</strong>
            <small>{system.outcome}</small>

            <div className="stack-sm">
              <span className="eyebrow">3 sygnaly core</span>
              <ul>
                {system.coreSignals.slice(0, 3).map((signal) => (
                  <li key={signal.name}>{signal.name}</li>
                ))}
              </ul>
            </div>

            <div className="stack-sm">
              <span className="eyebrow">2 opcjonalne (preview)</span>
              <ul>
                {system.advancedSignals.slice(0, 2).map((signal) => (
                  <li key={signal.name}>{signal.name}</li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      <Card title="Wybrany system" subtitle="System prowadzi Cie jak protokol, nie jak lista ustawien.">
        <p>
          <strong>{selectedSystem?.name}</strong>
        </p>
        <small>{selectedSystem?.outcome}</small>
        <Button onClick={activate} size="lg" variant="primary" disabled={isLoading || !selectedSystem}>
          {isLoading ? 'Aktywacja...' : 'Dalej: rytm dnia'}
        </Button>
      </Card>
    </section>
  );
}
