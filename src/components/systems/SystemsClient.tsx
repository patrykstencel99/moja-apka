'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

function cadenceLabel(value: StarterSignal['cadence']) {
  if (value === 'RANO') {
    return 'Rano';
  }
  if (value === 'WIECZOR') {
    return 'Wieczor';
  }
  return 'W ciagu dnia';
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
      setError('Nie udalo sie pobrac danych Systemow.');
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
      setError('Nie udalo sie aktywowac systemu.');
      return;
    }

    const next = [systemId, ...activeIds.filter((id) => id !== systemId)].slice(0, 2);
    setActiveIds(next);
    writeStringArray(STORAGE_KEYS.activeSystems, next);

    setInfo(includeOptional ? 'System aktywowany (core + advanced).' : 'System aktywowany (core).');
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
      setError(data.error ?? 'Nie udalo sie dodac sygnalu.');
      return;
    }

    setName('');
    setType('BOOLEAN');
    setCadence('DZIEN');
    setDefinitionTouched(false);
    setDefinition(generateDefinition({ name: '', cadence: 'DZIEN', type: 'BOOLEAN' }));
    setInfo('Custom sygnal dodany.');
    await load();
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? 'Problem' : 'Status'}>
          {error ?? info}
        </Banner>
      )}

      <Card
        tone="elevated"
        title="Aktywne systemy"
        subtitle="Priorytet: 1 system. Maksymalnie 2 aktywne."
      >
        {activeSystems.length === 0 ? (
          <div className="empty-state">Brak aktywnego systemu. Aktywuj jeden system ponizej.</div>
        ) : (
          <div className="grid grid-2">
            {activeSystems.map((system) => (
              <Card
                key={system.id}
                subtitle={`Core ${system.coreSignals.length} • Adv ${system.advancedSignals.length}`}
                title={system.name}
              >
                <p>{system.outcome}</p>
                <div className="setup-system-actions">
                  <Link className="review-link" href={`/systems/${system.id}`}>
                    Szczegoly
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card
        tone="elevated"
        title="Starter Systems"
        subtitle="Najpierw binarnie. Dopiero potem precyzja."
      >
        <div className="grid grid-3">
          {systems.map((system) => (
            <Card
              key={system.id}
              subtitle={system.outcome}
              title={system.name}
              actions={<span className="metric-badge">Core {system.coreSignals.length} • Adv {system.advancedSignals.length}</span>}
            >
              <div className="setup-signal-columns">
                <div>
                  <strong>Core</strong>
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
                  <strong>Advanced</strong>
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
                  <strong>Domyslne okno:</strong> {system.defaults.checkWindow}
                </small>
                <small>
                  <strong>Zasada oceny:</strong> {system.defaults.scoreRule}
                </small>
              </div>

              <div className="setup-system-actions">
                <Button onClick={() => void activateSystem(system.id, false)} size="sm" variant="secondary">
                  Aktywuj core
                </Button>
                <Button onClick={() => void activateSystem(system.id, true)} size="sm" variant="ghost">
                  Aktywuj core + advanced
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        tone="default"
        title="Generator definicji sygnalu"
        subtitle="Skala 0-10 jest narzedziem. Nie ozdoba."
      >
        {suggestedType !== type && (
          <Banner tone="warning" title="Sugestia">
            Ten sygnal wyglada na {suggestedType === 'BOOLEAN' ? 'Tak/Nie' : 'skale 0-10'}. Zmien typ tylko, jesli to ma realny sens.
          </Banner>
        )}

        <div className="grid grid-4">
          <label className="stack-sm">
            Nazwa sygnalu
            <input onChange={(event) => setName(event.target.value)} placeholder="np. Scroll przed pierwszym blokiem pracy" value={name} />
          </label>

          <label className="stack-sm">
            Kategoria
            <input onChange={(event) => setCategory(event.target.value)} placeholder="np. Produktywnosc" value={category} />
          </label>

          <label className="stack-sm">
            Kiedy mierzysz?
            <select onChange={(event) => setCadence(event.target.value as StarterSignal['cadence'])} value={cadence}>
              <option value="RANO">Rano</option>
              <option value="DZIEN">W ciagu dnia</option>
              <option value="WIECZOR">Wieczorem</option>
            </select>
          </label>

          <label className="stack-sm">
            Typ
            <select onChange={(event) => setType(event.target.value as 'BOOLEAN' | 'NUMERIC_0_10')} value={type}>
              <option value="BOOLEAN">Tak/Nie (domyslnie)</option>
              <option value="NUMERIC_0_10">Skala 0-10</option>
            </select>
          </label>
        </div>

        <label className="stack-sm">
          Co to znaczy &quot;zaliczone&quot;?
          <textarea
            onChange={(event) => {
              setDefinition(event.target.value);
              setDefinitionTouched(true);
            }}
            placeholder="Tak = ... / 0-10 = ..."
            value={definition}
          />
        </label>

        <Button block disabled={!name.trim()} onClick={() => void addCustomSignal()} variant="primary">
          Dodaj sygnal
        </Button>

        <small>Aktywnych sygnalow w systemie: {activities.length}</small>
      </Card>
    </div>
  );
}
