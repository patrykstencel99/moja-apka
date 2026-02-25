'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

function generateDefinition(params: { name: string; cadence: StarterSignal['cadence']; type: 'BOOLEAN' | 'NUMERIC_0_10' }) {
  const { name, cadence, type } = params;
  const when = cadenceLabel(cadence).toLowerCase();

  if (type === 'BOOLEAN') {
    return `Tak = warunek "${name || 'sygnal'}" wystapil ${when}.`;
  }

  return `0 = bardzo zle, 10 = idealnie. Ocen "${name || 'sygnal'}" ${when}.`;
}

export function SystemsClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [systems, setSystems] = useState<StarterSystem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Wlasne');
  const [cadence, setCadence] = useState<StarterSignal['cadence']>('DZIEN');
  const [type, setType] = useState<'BOOLEAN' | 'NUMERIC_0_10'>('BOOLEAN');
  const [definition, setDefinition] = useState('');
  const [definitionTouched, setDefinitionTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const suggestedType = useMemo(() => inferSignalType(name), [name]);

  useEffect(() => {
    if (definitionTouched) {
      return;
    }
    setDefinition(generateDefinition({ name, cadence, type }));
  }, [name, cadence, type, definitionTouched]);

  useEffect(() => {
    setActiveIds(readStringArray(STORAGE_KEYS.activeSystems));
  }, []);

  const load = useCallback(async () => {
    setError(null);

    const [systemsRes, activitiesRes] = await Promise.all([
      fetch('/api/setup/starter-packs'),
      fetch('/api/setup/activities')
    ]);

    if (!systemsRes.ok || !activitiesRes.ok) {
      setError(uiCopy.systems.loadError);
      return;
    }

    const systemsData = (await systemsRes.json()) as SystemsResponse;
    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };

    setSystems(systemsData.systems);
    setActivities(activitiesData.activities);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSystems = useMemo(
    () => systems.filter((system) => activeIds.includes(system.id)),
    [systems, activeIds]
  );

  const activateSystem = async (systemId: string, includeOptional: boolean) => {
    setError(null);
    setInfo(null);

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

    setInfo(includeOptional ? uiCopy.systems.activatedFull : uiCopy.systems.activatedCore);
    await load();
  };

  const addCustomSignal = async () => {
    setError(null);
    setInfo(null);

    const response = await fetch('/api/setup/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, type })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? uiCopy.systems.addSignalError);
      return;
    }

    setName('');
    setType('BOOLEAN');
    setCadence('DZIEN');
    setDefinitionTouched(false);
    setDefinition(generateDefinition({ name: '', cadence: 'DZIEN', type: 'BOOLEAN' }));
    setInfo(uiCopy.systems.customSignalAdded);
    await load();
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? uiCopy.systems.bannerProblem : uiCopy.systems.bannerStatus}>
          {error ?? info}
        </Banner>
      )}

      <Card
        tone="elevated"
        title={uiCopy.systems.activeTitle}
        subtitle={uiCopy.systems.activeSubtitle}
      >
        {activeSystems.length === 0 ? (
          <div className="empty-state">{uiCopy.systems.activeEmpty}</div>
        ) : (
          <div className="grid grid-2">
            {activeSystems.map((system) => (
              <Card
                className="card-stagger"
                key={system.id}
                subtitle={`Podst ${system.coreSignals.length} • Rozs ${system.advancedSignals.length}`}
                title={system.name}
              >
                <div className="system-hero">
                  <Image
                    alt={`${system.name} visual`}
                    height={220}
                    sizes="(max-width: 1020px) 100vw, 33vw"
                    src={SYSTEM_VISUAL[system.id] ?? '/visuals/topography-map.svg'}
                    width={640}
                  />
                </div>
                <p>{system.outcome}</p>
                <div className="setup-system-actions">
                  <Link className="review-link" href={`/systems/${system.id}`}>
                    {uiCopy.systems.detailsLink}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card
        tone="elevated"
        title={uiCopy.systems.starterTitle}
        subtitle={uiCopy.systems.starterSubtitle}
      >
        <div className="grid grid-3">
          {systems.map((system) => (
            <Card
              className="card-stagger"
              key={system.id}
              subtitle={system.outcome}
              title={system.name}
              actions={<span className="metric-badge">Podst {system.coreSignals.length} • Rozs {system.advancedSignals.length}</span>}
            >
              <div className="system-hero">
                <Image
                  alt={`${system.name} visual`}
                  height={220}
                  sizes="(max-width: 1020px) 100vw, 33vw"
                  src={SYSTEM_VISUAL[system.id] ?? '/visuals/topography-map.svg'}
                  width={640}
                />
              </div>
              <div className="setup-signal-columns">
                <div>
                  <strong>{uiCopy.systems.coreLabel}</strong>
                  <ul>
                    {system.coreSignals.map((signal) => (
                      <li key={`${system.id}-${signal.name}`}>
                        <div>
                          <strong>{signal.name}</strong> <small>({signal.type === 'BOOLEAN' ? 'tak/nie' : '0-10'})</small>
                        </div>
                        <small>{signal.why}</small>
                        <small>{cadenceLabel(signal.cadence)} • {signal.definition}</small>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong>{uiCopy.systems.advancedLabel}</strong>
                  <ul>
                    {system.advancedSignals.map((signal) => (
                      <li key={`${system.id}-adv-${signal.name}`}>
                        <div>
                          <strong>{signal.name}</strong> <small>({signal.type === 'BOOLEAN' ? 'tak/nie' : '0-10'})</small>
                        </div>
                        <small>{signal.why}</small>
                        <small>{cadenceLabel(signal.cadence)} • {signal.definition}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="panel-subtle">
                <small>
                  <strong>{uiCopy.systems.defaultsWindowLabel}</strong> {system.defaults.checkWindow}
                </small>
                <small>
                  <strong>{uiCopy.systems.defaultsRuleLabel}</strong> {system.defaults.scoreRule}
                </small>
              </div>

              <div className="setup-system-actions">
                <Button onClick={() => void activateSystem(system.id, false)} size="sm" variant="secondary">
                  {uiCopy.systems.activateCore}
                </Button>
                <Button onClick={() => void activateSystem(system.id, true)} size="sm" variant="ghost">
                  {uiCopy.systems.activateFull}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        tone="default"
        title={uiCopy.systems.generatorTitle}
        subtitle={uiCopy.systems.generatorSubtitle}
      >
        {suggestedType !== type && (
          <Banner tone="warning" title={uiCopy.systems.suggestionTitle}>
            {uiCopy.systems.suggestionBodyPrefix}{' '}
            {suggestedType === 'BOOLEAN' ? uiCopy.systems.suggestionBodyBoolean : uiCopy.systems.suggestionBodyNumeric}
            {uiCopy.systems.suggestionBodySuffix}
          </Banner>
        )}

        <div className="grid grid-4">
          <label className="stack-sm">
            {uiCopy.systems.signalNameLabel}
            <input onChange={(event) => setName(event.target.value)} placeholder={uiCopy.systems.signalNamePlaceholder} value={name} />
          </label>

          <label className="stack-sm">
            {uiCopy.systems.categoryLabel}
            <input onChange={(event) => setCategory(event.target.value)} placeholder={uiCopy.systems.categoryPlaceholder} value={category} />
          </label>

          <label className="stack-sm">
            {uiCopy.systems.cadenceLabel}
            <select onChange={(event) => setCadence(event.target.value as StarterSignal['cadence'])} value={cadence}>
              <option value="RANO">{uiCopy.systems.cadenceMorning}</option>
              <option value="DZIEN">{uiCopy.systems.cadenceDay}</option>
              <option value="WIECZOR">{uiCopy.systems.cadenceEvening}</option>
            </select>
          </label>

          <label className="stack-sm">
            {uiCopy.systems.typeLabel}
            <select onChange={(event) => setType(event.target.value as 'BOOLEAN' | 'NUMERIC_0_10')} value={type}>
              <option value="BOOLEAN">{uiCopy.systems.typeBoolean}</option>
              <option value="NUMERIC_0_10">{uiCopy.systems.typeNumeric}</option>
            </select>
          </label>
        </div>

        <label className="stack-sm">
          {uiCopy.systems.definitionLabel}
          <textarea
            onChange={(event) => {
              setDefinition(event.target.value);
              setDefinitionTouched(true);
            }}
            placeholder={uiCopy.systems.definitionPlaceholder}
            value={definition}
          />
        </label>

        <Button block disabled={!name.trim()} onClick={() => void addCustomSignal()} variant="primary">
          {uiCopy.systems.addSignalButton}
        </Button>

        <small>
          {uiCopy.systems.activeSignalsCount} {activities.length}
        </small>
      </Card>
    </div>
  );
}
