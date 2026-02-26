'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { readString, writeString } from '@/lib/state/local-storage';
import type { StarterSignal, StarterSystem } from '@/types/domain';

type Props = {
  system: StarterSystem;
};

type Activity = {
  id: string;
  name: string;
  category: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
};

type SignalConfig = {
  activityId: string | null;
  name: string;
  source: 'core' | 'advanced';
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  cadence: 'RANO' | 'DZIEN' | 'WIECZOR';
};

const CADENCE_OVERRIDES_KEY = 'pf_system_tune_cadence_v1';

const SIGNAL_ALIASES: Record<string, string[]> = {
  '60 minut glebokiej pracy przed poludniem': ['60 min glebokiej pracy przed poludniem'],
  'Notyfikacje wyciszone podczas bloku': ['Powiadomienia wyciszone podczas bloku'],
  'Brak ekranu 45 minut przed snem': ['Brak ekranu 45 min przed snem'],
  'Poranny poziom odswiezenia (0-10)': ['Poranne odswiezenie']
};

function normalizeSignal(signal: StarterSignal, source: 'core' | 'advanced'): SignalConfig {
  return {
    activityId: null,
    name: signal.name,
    source,
    type: signal.type,
    cadence: signal.cadence
  };
}

function signalStorageKey(systemId: string, signalName: string) {
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

function getSignalCandidates(name: string) {
  return [name, ...(SIGNAL_ALIASES[name] ?? [])];
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
        const response = await fetch('/api/setup/activities', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('LOAD_FAILED');
        }

        const data = (await response.json()) as { activities?: Activity[] };
        const activities = Array.isArray(data.activities) ? data.activities : [];
        const byName = new Map(activities.map((activity) => [activity.name.toLowerCase(), activity]));
        const cadenceOverrides = readCadenceOverrides();

        const merged = [
          ...system.coreSignals.map((signal) => normalizeSignal(signal, 'core')),
          ...system.advancedSignals.map((signal) => normalizeSignal(signal, 'advanced'))
        ].map((signal) => {
          const match = getSignalCandidates(signal.name)
            .map((candidate) => byName.get(candidate.toLowerCase()))
            .find(Boolean);

          return {
            ...signal,
            activityId: match?.id ?? null,
            type: match?.type ?? signal.type,
            cadence: cadenceOverrides[signalStorageKey(system.id, signal.name)] ?? signal.cadence
          };
        });

        if (!isActive) {
          return;
        }

        setConfigs(merged);
        setBaseline(merged);
      } catch {
        if (isActive) {
          setError('Nie udalo sie pobrac konfiguracji systemu.');
        }
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

  const baselineByName = useMemo(() => new Map(baseline.map((item) => [item.name, item])), [baseline]);
  const hasChanges = useMemo(
    () =>
      configs.some((item) => {
        const base = baselineByName.get(item.name);
        return !base || base.type !== item.type || base.cadence !== item.cadence;
      }),
    [baselineByName, configs]
  );
  const linkedCount = useMemo(() => configs.filter((item) => item.activityId !== null).length, [configs]);
  const coreConfigs = useMemo(() => configs.filter((item) => item.source === 'core'), [configs]);
  const advancedConfigs = useMemo(() => configs.filter((item) => item.source === 'advanced'), [configs]);

  const save = async () => {
    if (isLoading || isSaving || !hasChanges) {
      return;
    }

    setSaved(false);
    setError(null);
    setIsSaving(true);

    try {
      const cadenceOverrides = readCadenceOverrides();
      for (const config of configs) {
        cadenceOverrides[signalStorageKey(system.id, config.name)] = config.cadence;
      }
      writeCadenceOverrides(cadenceOverrides);

      const changedTypes = configs.filter((item) => {
        const base = baselineByName.get(item.name);
        return Boolean(item.activityId && base && base.type !== item.type);
      });

      if (changedTypes.length > 0) {
        const results = await Promise.all(
          changedTypes.map(async (item) => {
            const response = await fetch(`/api/setup/activities/${item.activityId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: item.type })
            });

            return {
              name: item.name,
              ok: response.ok
            };
          })
        );

        const failed = results.filter((result) => !result.ok).map((result) => result.name);
        if (failed.length > 0) {
          setError(`Nie udalo sie zapisac typu dla: ${failed.join(', ')}.`);
          return;
        }
      }

      setBaseline(configs);
      setSaved(true);
    } catch {
      setError('Nie udalo sie zapisac dopasowania systemu.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSignal = (signal: SignalConfig) => (
    <Card key={signal.name} subtitle={signal.activityId ? 'Aktywny sygnal' : 'Najpierw aktywuj system'} title={signal.name}>
      <div className="grid grid-2">
        <label className="stack-sm">
          {uiCopy.systemTune.typeLabel}
          <select
            disabled={!signal.activityId}
            onChange={(event) =>
              updateSignal(signal.name, {
                type: event.target.value as SignalConfig['type']
              })
            }
            value={signal.type}
          >
            <option value="BOOLEAN">{uiCopy.systemTune.typeBooleanOption}</option>
            <option value="NUMERIC_0_10">{uiCopy.systemTune.typeNumericOption}</option>
          </select>
        </label>

        <label className="stack-sm">
          {uiCopy.systemTune.cadenceLabel}
          <select
            onChange={(event) =>
              updateSignal(signal.name, {
                cadence: event.target.value as SignalConfig['cadence']
              })
            }
            value={signal.cadence}
          >
            <option value="RANO">{uiCopy.systemTune.cadenceMorning}</option>
            <option value="DZIEN">{uiCopy.systemTune.cadenceDay}</option>
            <option value="WIECZOR">{uiCopy.systemTune.cadenceEvening}</option>
          </select>
        </label>
      </div>
      <small>{signal.activityId ? 'Typ zapisze sie do backendu. Cadence zapisuje sie lokalnie.' : 'Sygnal nie jest jeszcze aktywny.'}</small>
    </Card>
  );

  return (
    <div className="stack-lg">
      {error && (
        <Banner tone="danger" title="Problem">
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={`${uiCopy.systemTune.titlePrefix} ${system.name}`} subtitle={uiCopy.systemTune.subtitle}>
        {isLoading ? (
          <div className="empty-state">Ladowanie sygnalow...</div>
        ) : configs.length === 0 ? (
          <div className="empty-state">Brak sygnalow do dopasowania.</div>
        ) : linkedCount === 0 ? (
          <div className="stack">
            <div className="empty-state">Najpierw aktywuj system, zeby tuning mial efekt.</div>
            <Link className="inline-link" href={`/systems/${system.id}`}>
              Wroc do aktywacji systemu
            </Link>
          </div>
        ) : (
          <div className="stack">
            <Card tone="default" title="Podstawowe (na co dzien)" subtitle="Najpierw dopracuj sygnaly core.">
              <div className="stack">{coreConfigs.map(renderSignal)}</div>
            </Card>
            <Card tone="default" title="Rozszerzone (po tygodniu)" subtitle="Rozszerzenia uruchamiaj, gdy core jest stabilny.">
              <div className="stack">{advancedConfigs.map(renderSignal)}</div>
            </Card>
          </div>
        )}
      </Card>

      {saved && (
        <Banner tone="success" title={uiCopy.systemTune.savedTitle}>
          Konfiguracja zapisana. Wroc do codziennego check-inu i sprawdz, czy decyzje sa prostsze.
        </Banner>
      )}

      <div className="inline-actions">
        <Button disabled={isLoading || isSaving || !hasChanges} onClick={() => void save()} size="lg" variant="primary">
          {isSaving ? 'Zapisywanie...' : hasChanges ? 'Zapisz dopasowanie' : 'Brak zmian'}
        </Button>
        <Link className="inline-link" href="/">
          Przejdz do Dzisiaj
        </Link>
      </div>
    </div>
  );
}
