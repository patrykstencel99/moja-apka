'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { readString, writeString } from '@/lib/state/local-storage';
import type { StarterSignal, StarterSystem } from '@/types/domain';

type Props = {
  system: StarterSystem;
};

type SignalConfig = {
  id: string | null;
  name: string;
  category: string;
  source: 'core' | 'advanced';
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  cadence: 'RANO' | 'DZIEN' | 'WIECZOR';
};

type Activity = {
  id: string;
  name: string;
  category: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
};

const CADENCE_OVERRIDES_KEY = 'pf_signal_cadence_overrides_v1';

function normalizeSignal(signal: StarterSignal, source: 'core' | 'advanced'): SignalConfig {
  return {
    id: null,
    name: signal.name,
    category: '',
    source,
    type: signal.type,
    cadence: signal.cadence
  };
}

function signalKey(systemId: string, signalName: string) {
  return `${systemId}::${signalName.toLowerCase()}`;
}

function readCadenceOverrides() {
  const raw = readString(CADENCE_OVERRIDES_KEY);
  if (!raw) {
    return {} as Record<string, SignalConfig['cadence']>;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {} as Record<string, SignalConfig['cadence']>;
    }
    return parsed as Record<string, SignalConfig['cadence']>;
  } catch {
    return {} as Record<string, SignalConfig['cadence']>;
  }
}

function writeCadenceOverrides(overrides: Record<string, SignalConfig['cadence']>) {
  writeString(CADENCE_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function SystemTuneClient({ system }: Props) {
  const [configs, setConfigs] = useState<SignalConfig[]>([]);
  const [baseline, setBaseline] = useState<SignalConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/setup/activities');
        if (!response.ok) {
          throw new Error('ACTIVITIES_LOAD_FAILED');
        }

        const data = (await response.json()) as { activities?: Activity[] };
        const activities = Array.isArray(data.activities) ? data.activities : [];
        const byName = new Map(activities.map((activity) => [activity.name.toLowerCase(), activity]));
        const cadenceOverrides = readCadenceOverrides();

        const merged = [
          ...system.coreSignals.map((signal) => normalizeSignal(signal, 'core')),
          ...system.advancedSignals.map((signal) => normalizeSignal(signal, 'advanced'))
        ].map((signal) => {
          const matched = byName.get(signal.name.toLowerCase());
          const key = signalKey(system.id, signal.name);
          const overriddenCadence = cadenceOverrides[key];

          return {
            ...signal,
            id: matched?.id ?? null,
            category: matched?.category ?? system.category,
            type: matched?.type ?? signal.type,
            cadence: overriddenCadence ?? signal.cadence
          };
        });

        if (!isActive) {
          return;
        }

        setConfigs(merged);
        setBaseline(merged);
      } catch {
        if (!isActive) {
          return;
        }
        setError('Nie udalo sie pobrac konfiguracji sygnalow. Sprobuj ponownie.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [system]);

  const updateSignal = (name: string, patch: Partial<SignalConfig>) => {
    setSaved(false);
    setError(null);
    setConfigs((prev) => prev.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  };

  const baselineMap = useMemo(() => new Map(baseline.map((item) => [item.name, item])), [baseline]);
  const hasChanges = useMemo(
    () =>
      configs.some((item) => {
        const base = baselineMap.get(item.name);
        if (!base) {
          return true;
        }
        return base.type !== item.type || base.cadence !== item.cadence;
      }),
    [baselineMap, configs]
  );
  const linkedCount = useMemo(() => configs.filter((item) => item.id !== null).length, [configs]);

  const save = async () => {
    if (isSaving || isLoading || !hasChanges) {
      return;
    }

    setSaved(false);
    setError(null);
    setIsSaving(true);

    try {
      const cadenceOverrides = readCadenceOverrides();
      for (const config of configs) {
        cadenceOverrides[signalKey(system.id, config.name)] = config.cadence;
      }
      writeCadenceOverrides(cadenceOverrides);

      const changedTypes = configs.filter((item) => {
        const base = baselineMap.get(item.name);
        return item.id !== null && base && base.type !== item.type;
      });

      if (changedTypes.length > 0) {
        const results = await Promise.all(
          changedTypes.map(async (item) => {
            const response = await fetch(`/api/setup/activities/${item.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: item.type
              })
            });

            return { name: item.name, ok: response.ok };
          })
        );

        const failed = results.filter((result) => !result.ok).map((result) => result.name);
        if (failed.length > 0) {
          setError(`Nie udalo sie zapisac zmian typu dla: ${failed.join(', ')}.`);
          return;
        }
      }

      setBaseline(configs);
      setSaved(true);
    } catch {
      setError('Nie udalo sie zapisac konfiguracji. Sprobuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stack-lg">
      {error && (
        <Banner tone="danger" title="Problem">
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={`Doprecyzowanie: ${system.name}`} subtitle="Typ sygnalu i kiedy ma sens.">
        {isLoading ? (
          <div className="empty-state">Ladowanie konfiguracji systemu...</div>
        ) : configs.length === 0 ? (
          <div className="empty-state">Brak sygnalow do dopracowania w tym systemie.</div>
        ) : linkedCount === 0 ? (
          <div className="stack">
            <div className="empty-state">Najpierw aktywuj system, aby dopracowac sygnaly.</div>
            <Link className="inline-link" href={`/systems/${system.id}`}>
              Wroc do aktywacji systemu
            </Link>
          </div>
        ) : (
          <div className="stack">
            {configs.map((signal) => (
              <Card
                key={signal.name}
                subtitle={signal.id ? 'Dopasuj pod swoj rytm' : 'Ten sygnal nie jest jeszcze aktywny'}
                title={signal.name}
              >
                <div className="grid grid-2">
                  <label className="stack-sm">
                    Typ
                    <select
                      disabled={!signal.id}
                      onChange={(event) =>
                        updateSignal(signal.name, {
                          type: event.target.value as SignalConfig['type']
                        })
                      }
                      value={signal.type}
                    >
                      <option value="BOOLEAN">Tak/Nie</option>
                      <option value="NUMERIC_0_10">Skala 0-10</option>
                    </select>
                  </label>

                  <label className="stack-sm">
                    Kiedy ma sens
                    <select
                      onChange={(event) =>
                        updateSignal(signal.name, {
                          cadence: event.target.value as SignalConfig['cadence']
                        })
                      }
                      value={signal.cadence}
                    >
                      <option value="RANO">Rano</option>
                      <option value="DZIEN">W ciagu dnia</option>
                      <option value="WIECZOR">Wieczorem</option>
                    </select>
                  </label>
                </div>
                {signal.id ? (
                  <small>Zrodlo: {signal.source === 'core' ? 'Core' : 'Advanced'} • Zapis typu idzie do backendu.</small>
                ) : (
                  <small>Aktywuj system (core lub core + advanced), aby zapisac typ sygnalu do backendu.</small>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {saved && (
        <Banner tone="success" title="Zapisane lokalnie">
          Cadence zapisany lokalnie, typ sygnalu zapisany dla aktywnych pozycji.
        </Banner>
      )}

      <div className="inline-actions">
        <Button disabled={isLoading || isSaving || !hasChanges} onClick={() => void save()} size="lg" variant="primary">
          {isSaving ? 'Zapisywanie...' : hasChanges ? 'Zapisz dopracowanie' : 'Brak zmian'}
        </Button>
        <Link className="inline-link" href={`/systems/${system.id}`}>
          Wroc do systemu
        </Link>
      </div>
    </div>
  );
}
