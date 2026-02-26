'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fetchJsonCached, invalidateClientFetchCache } from '@/lib/client-fetch-cache';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readStringArray, writeStringArray } from '@/lib/state/local-storage';
import type { StarterSystem } from '@/types/domain';

type Activity = {
  id: string;
  name: string;
  category: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
};

type StarterSignal = StarterSystem['coreSignals'][number];

type SystemsResponse = {
  systems: StarterSystem[];
};

const SYSTEM_VISUAL: Record<string, string> = {
  'stabilna-energia': '/visuals/radar-echo.svg',
  'gleboka-praca': '/visuals/cockpit-minimal.svg',
  'sen-bez-tarcia': '/visuals/premium-material.svg'
};

function cadenceLabel(value: StarterSignal['cadence']) {
  if (value === 'RANO') {
    return uiCopy.systems.cadenceMorning;
  }
  if (value === 'WIECZOR') {
    return uiCopy.systems.cadenceEvening;
  }
  return uiCopy.systems.cadenceDay;
}

function inferSignalType(name: string) {
  const normalized = name.toLowerCase();
  const numericHints = ['stabilnosc', 'jakosc', 'poziom', 'liczba', 'intensywnosc', 'odswiezenie', 'wybudzenia'];
  return numericHints.some((hint) => normalized.includes(hint)) ? 'NUMERIC_0_10' : 'BOOLEAN';
}

export function SystemsClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [systems, setSystems] = useState<StarterSystem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Wlasne');
  const [type, setType] = useState<'BOOLEAN' | 'NUMERIC_0_10'>('BOOLEAN');

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingActivationId, setPendingActivationId] = useState<string | null>(null);
  const [isAddingSignal, setIsAddingSignal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const suggestedType = useMemo(() => inferSignalType(name), [name]);

  useEffect(() => {
    setActiveIds(readStringArray(STORAGE_KEYS.activeSystems));
  }, []);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    setError(null);
    const bust = mode === 'refresh';

    if (mode === 'initial') {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [systemsRes, activitiesRes] = await Promise.all([
        fetchJsonCached<SystemsResponse>('/api/setup/starter-packs', { ttlMs: 60_000, bust }),
        fetchJsonCached<{ activities: Activity[] }>('/api/setup/activities', { ttlMs: 20_000, bust })
      ]);

      if (!systemsRes.ok || !activitiesRes.ok || !systemsRes.data || !activitiesRes.data) {
        setError(uiCopy.systems.loadError);
        return;
      }

      const systemsData = systemsRes.data;
      const activitiesData = activitiesRes.data;

      setSystems(Array.isArray(systemsData.systems) ? systemsData.systems : []);
      setActivities(Array.isArray(activitiesData.activities) ? activitiesData.activities : []);
    } catch {
      setError(uiCopy.systems.loadError);
    } finally {
      if (mode === 'initial') {
        setIsInitialLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const activeSystems = useMemo(() => systems.filter((system) => activeIds.includes(system.id)), [systems, activeIds]);

  const activateSystem = async (systemId: string, includeOptional: boolean) => {
    if (pendingActivationId) {
      return;
    }

    setError(null);
    setInfo(null);
    setPendingActivationId(systemId);

    try {
      const response = await fetch('/api/systems/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId, includeOptional })
      });

      if (!response.ok) {
        setError(uiCopy.systems.activateError);
        return;
      }

      const next = [systemId, ...activeIds.filter((id) => id !== systemId)].slice(0, 2);
      setActiveIds(next);
      writeStringArray(STORAGE_KEYS.activeSystems, next);
      invalidateClientFetchCache('/api/setup/activities');

      setInfo(includeOptional ? uiCopy.systems.activatedFull : uiCopy.systems.activatedCore);
      await load('refresh');
    } catch {
      setError(uiCopy.systems.activateError);
    } finally {
      setPendingActivationId(null);
    }
  };

  const addCustomSignal = async () => {
    if (isAddingSignal || !name.trim()) {
      return;
    }

    setError(null);
    setInfo(null);
    setIsAddingSignal(true);

    try {
      const response = await fetch('/api/setup/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, type })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: uiCopy.systems.addSignalError }))) as { error?: string };
        setError(data.error ?? uiCopy.systems.addSignalError);
        return;
      }

      setName('');
      setType('BOOLEAN');
      invalidateClientFetchCache('/api/setup/activities');
      setInfo(uiCopy.systems.customSignalAdded);
      await load('refresh');
    } catch {
      setError(uiCopy.systems.addSignalError);
    } finally {
      setIsAddingSignal(false);
    }
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? uiCopy.systems.bannerProblem : uiCopy.systems.bannerStatus}>
          {error ?? info}
        </Banner>
      )}

      <Card tone="elevated" title="Aktywny system" subtitle="Jeden system na raz daje najwyzsza czytelnosc decyzji.">
        {isInitialLoading ? (
          <div className="empty-state">Ladowanie aktywnego systemu...</div>
        ) : activeSystems.length === 0 ? (
          <div className="stack">
            <div className="empty-state">Nie masz aktywnego systemu. Wybierz jeden ponizej i od razu przejdz do check-inu.</div>
          </div>
        ) : (
          <div className="grid grid-2">
            {activeSystems.map((system) => (
              <Card
                className="card-stagger"
                key={system.id}
                subtitle={`Dzisiaj mierzysz ${system.coreSignals.length} sygnaly core`}
                title={system.name}
              >
                <p>{system.outcome}</p>
                <ul>
                  {system.coreSignals.slice(0, 3).map((signal) => (
                    <li key={`${system.id}-active-${signal.name}`}>
                      <small>
                        <strong>{signal.name}</strong> ({cadenceLabel(signal.cadence)})
                      </small>
                    </li>
                  ))}
                </ul>
                <div className="inline-actions">
                  <Link className="inline-link" href="/">
                    Przejdz do Dzisiaj
                  </Link>
                  <Link className="inline-link" href={`/systems/${system.id}/tune`}>
                    Dopasuj
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card tone="elevated" title="Systemy startowe" subtitle="Wybierz wynik, ktory chcesz poprawic przez najblizsze 7 dni.">
        {isInitialLoading ? (
          <div className="empty-state">Ladowanie listy systemow...</div>
        ) : systems.length === 0 ? (
          <div className="stack">
            <div className="empty-state">Brak systemow do wyswietlenia.</div>
            <Button onClick={() => void load('initial')} size="sm" variant="secondary">
              Sprobuj ponownie
            </Button>
          </div>
        ) : (
          <div className="grid grid-3">
            {systems.map((system) => (
              <Card
                className="card-stagger"
                key={system.id}
                subtitle={system.outcome}
                title={system.name}
                actions={
                  <span className="metric-badge">
                    Core {system.coreSignals.length} - Adv {system.advancedSignals.length}
                  </span>
                }
              >
                <div className="system-hero">
                  <Image
                    alt={`${system.name} - ${uiCopy.systems.visualAltSuffix}`}
                    height={220}
                    sizes="(max-width: 1020px) 100vw, 33vw"
                    src={SYSTEM_VISUAL[system.id] ?? '/visuals/topography-map.svg'}
                    width={640}
                  />
                </div>

                <p>
                  <strong>Dzisiaj (core):</strong>
                </p>
                <ul>
                  {system.coreSignals.slice(0, 3).map((signal) => (
                    <li key={`${system.id}-core-${signal.name}`}>
                      <small>
                        {signal.name} ({signal.type === 'BOOLEAN' ? uiCopy.systems.signalTypeBooleanShort : uiCopy.systems.signalTypeNumericShort}
                        )
                      </small>
                    </li>
                  ))}
                </ul>

                <div className="panel-subtle">
                  <small>
                    <strong>Po tygodniu:</strong> dolacz {system.advancedSignals.length} sygnaly rozszerzone.
                  </small>
                  <small>
                    <strong>Okno check-in:</strong> {system.defaults.checkWindow}
                  </small>
                </div>

                <div className="setup-system-actions">
                  <Button
                    disabled={pendingActivationId !== null}
                    onClick={() => void activateSystem(system.id, false)}
                    size="sm"
                    variant="secondary"
                  >
                    {pendingActivationId === system.id ? 'Aktywacja...' : 'Aktywuj podstawowe'}
                  </Button>
                  <Button
                    disabled={pendingActivationId !== null}
                    onClick={() => void activateSystem(system.id, true)}
                    size="sm"
                    variant="ghost"
                  >
                    {pendingActivationId === system.id ? 'Aktywacja...' : 'Aktywuj podstawowe + rozszerzone'}
                  </Button>
                </div>

                <div className="setup-system-actions">
                  <Link className="review-link" href={`/systems/${system.id}`}>
                    Zobacz szczegoly
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card tone="default" title="Opcjonalnie: wlasny sygnal" subtitle="Dodaj tylko wtedy, gdy realnie pomaga w decyzji dnia.">
        {suggestedType !== type && (
          <Banner tone="warning" title={uiCopy.systems.suggestionTitle}>
            {uiCopy.systems.suggestionBodyPrefix}{' '}
            {suggestedType === 'BOOLEAN' ? uiCopy.systems.suggestionBodyBoolean : uiCopy.systems.suggestionBodyNumeric}
            {uiCopy.systems.suggestionBodySuffix}
          </Banner>
        )}

        <div className="grid grid-3">
          <label className="stack-sm">
            {uiCopy.systems.signalNameLabel}
            <input onChange={(event) => setName(event.target.value)} placeholder={uiCopy.systems.signalNamePlaceholder} value={name} />
          </label>

          <label className="stack-sm">
            {uiCopy.systems.categoryLabel}
            <input onChange={(event) => setCategory(event.target.value)} placeholder={uiCopy.systems.categoryPlaceholder} value={category} />
          </label>

          <label className="stack-sm">
            {uiCopy.systems.typeLabel}
            <select onChange={(event) => setType(event.target.value as 'BOOLEAN' | 'NUMERIC_0_10')} value={type}>
              <option value="BOOLEAN">{uiCopy.systems.typeBoolean}</option>
              <option value="NUMERIC_0_10">{uiCopy.systems.typeNumeric}</option>
            </select>
          </label>
        </div>

        <Button block disabled={!name.trim() || isAddingSignal} onClick={() => void addCustomSignal()} variant="primary">
          {isAddingSignal ? 'Dodawanie...' : uiCopy.systems.addSignalButton}
        </Button>

        <small>
          {uiCopy.systems.activeSignalsCount} {activities.length}
          {isRefreshing ? ' (odswiezanie...)' : ''}
        </small>
      </Card>
    </div>
  );
}
