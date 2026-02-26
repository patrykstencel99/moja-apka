'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readStringArray, writeStringArray } from '@/lib/state/local-storage';
import type { StarterSystem } from '@/types/domain';

type Props = {
  system: StarterSystem;
};

function cadenceLabel(value: 'RANO' | 'DZIEN' | 'WIECZOR') {
  if (value === 'RANO') {
    return uiCopy.systemDetail.cadenceMorning;
  }
  if (value === 'WIECZOR') {
    return uiCopy.systemDetail.cadenceEvening;
  }
  return uiCopy.systemDetail.cadenceDay;
}

export function SystemDetailClient({ system }: Props) {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<'core' | 'full' | null>(null);

  const todaySignals = useMemo(() => system.coreSignals.slice(0, 3), [system.coreSignals]);
  const afterWeekSignals = useMemo(() => system.advancedSignals.slice(0, 3), [system.advancedSignals]);

  const activate = async (includeOptional: boolean) => {
    if (pendingMode) {
      return;
    }

    setPendingMode(includeOptional ? 'full' : 'core');
    setInfo(null);
    setError(null);

    try {
      const response = await fetch('/api/systems/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: system.id, includeOptional })
      });

      if (!response.ok) {
        setError(uiCopy.systemDetail.activateError);
        return;
      }

      const active = readStringArray(STORAGE_KEYS.activeSystems);
      const next = [system.id, ...active.filter((id) => id !== system.id)].slice(0, 2);
      writeStringArray(STORAGE_KEYS.activeSystems, next);

      setInfo(includeOptional ? 'System aktywowany (podstawowe + rozszerzone).' : 'System aktywowany (podstawowe).');
    } catch {
      setError(uiCopy.systemDetail.activateError);
    } finally {
      setPendingMode(null);
    }
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? uiCopy.systemDetail.bannerProblem : uiCopy.systemDetail.bannerStatus}>
          {error ?? info}
        </Banner>
      )}

      <Card tone="elevated" title={system.name} subtitle="Po co ten system i jak go uzywac dzisiaj.">
        <p>{system.outcome}</p>
        <div className="panel-subtle">
          <small>
            <strong>1. Dzisiaj:</strong> zaznacz 3 sygnaly podstawowe.
          </small>
          <small>
            <strong>2. Przez 7 dni:</strong> utrzymaj codzienny check-in.
          </small>
          <small>
            <strong>3. Potem:</strong> dorzuc 1-2 sygnaly rozszerzone.
          </small>
        </div>
      </Card>

      <Card tone="elevated" title="Dzisiaj (core)" subtitle="To jest Twoja lista decyzji na kazdy dzien.">
        <div className="stack">
          {todaySignals.map((signal) => (
            <Card key={signal.name} subtitle={`${uiCopy.systemDetail.cadencePrefix} ${cadenceLabel(signal.cadence)}`} title={signal.name}>
              <small>{signal.definition}</small>
            </Card>
          ))}
        </div>
      </Card>

      <Card tone="default" title="Po 7 dniach (advanced)" subtitle="Rozszerzenia wlaczaj dopiero gdy core jest stabilny.">
        <div className="stack">
          {afterWeekSignals.length === 0 ? (
            <div className="empty-state">Brak sygnalow rozszerzonych.</div>
          ) : (
            afterWeekSignals.map((signal) => (
              <Card key={signal.name} subtitle={`${uiCopy.systemDetail.cadencePrefix} ${cadenceLabel(signal.cadence)}`} title={signal.name}>
                <small>{signal.definition}</small>
              </Card>
            ))
          )}
        </div>
      </Card>

      <div className="inline-actions">
        <Button disabled={pendingMode !== null} onClick={() => void activate(false)} size="lg" variant="primary">
          {pendingMode === 'core' ? 'Aktywacja...' : 'Aktywuj podstawowe'}
        </Button>
        <Button disabled={pendingMode !== null} onClick={() => void activate(true)} size="lg" variant="ghost">
          {pendingMode === 'full' ? 'Aktywacja...' : 'Aktywuj podstawowe + rozszerzone'}
        </Button>
      </div>

      <div className="inline-actions">
        <Link className="inline-link" href={`/systems/${system.id}/tune`}>
          Dopasuj sygnaly
        </Link>
        <Link className="inline-link" href="/">
          Przejdz do Dzisiaj
        </Link>
      </div>
    </div>
  );
}
