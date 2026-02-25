'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Activity = {
  id: string;
  name: string;
  category: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  iconKey?: string;
  priority?: number;
  valenceHint?: 'positive' | 'negative' | 'neutral';
};

type StarterSignal = {
  name: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  why: string;
  cadence: 'RANO' | 'WIECZOR' | 'DZIEN';
  definition: string;
};

type StarterSystem = {
  id: string;
  name: string;
  category: string;
  outcome: string;
  description?: string;
  coreSignals: StarterSignal[];
  advancedSignals: StarterSignal[];
  defaults: {
    checkWindow: string;
    scoreRule: string;
  };
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

export function SetupManager() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [systems, setSystems] = useState<StarterSystem[]>([]);
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

  const load = useCallback(async () => {
    const [systemsRes, activitiesRes] = await Promise.all([
      fetch('/api/setup/starter-packs'),
      fetch('/api/setup/activities')
    ]);

    if (!systemsRes.ok || !activitiesRes.ok) {
      setError('Nie udalo sie pobrac danych setupu.');
      return;
    }

    const systemsData = (await systemsRes.json()) as { systems: StarterSystem[] };
    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    setSystems(systemsData.systems);
    setActivities(activitiesData.activities);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
      const list = map.get(activity.category) ?? [];
      list.push(activity);
      map.set(activity.category, list.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50)));
    }
    return map;
  }, [activities]);

  const addCustom = async () => {
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
    setInfo('Nowy sygnal dodany do systemu.');
    await load();
  };

  const removeActivity = async (id: string) => {
    setError(null);
    setInfo(null);

    const response = await fetch(`/api/setup/activities/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setError('Nie udalo sie zarchiwizowac sygnalu.');
      return;
    }

    setInfo('Sygnal zostal przeniesiony do archiwum.');
    await load();
  };

  const importSystem = async (system: StarterSystem, includeAdvanced: boolean) => {
    setError(null);
    setInfo(null);

    const selectedSignals = includeAdvanced
      ? [...system.coreSignals, ...system.advancedSignals]
      : system.coreSignals;

    let imported = 0;
    for (const signal of selectedSignals) {
      const exists = activities.some((activity) => activity.name === signal.name);
      if (exists) {
        continue;
      }

      const response = await fetch('/api/setup/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signal.name,
          category: system.category,
          type: signal.type
        })
      });

      if (response.ok) {
        imported += 1;
      }
    }

    const modeLabel = includeAdvanced ? 'core + advanced' : 'core';
    setInfo(`${system.name}: aktywowano ${modeLabel}. Dodane sygnaly: ${imported}.`);
    await load();
  };

  return (
    <div className="stack-lg">
      {(error || info) && (
        <Banner tone={error ? 'danger' : 'success'} title={error ? 'Problem zapisu' : 'Aktualizacja systemu'}>
          {error ?? info}
        </Banner>
      )}

      <Card
        tone="elevated"
        title="Starter Systems"
        subtitle="Wybierz system pod wynik. Najpierw odpal core (3 sygnaly), potem dopnij advanced."
      >
        <div className="grid grid-3">
          {systems.map((system) => (
            <Card
              key={system.id}
              title={system.name}
              subtitle={system.description ?? system.outcome}
              actions={<span className="metric-badge">Core {system.coreSignals.length} • Adv {system.advancedSignals.length}</span>}
            >
              <p>{system.outcome}</p>

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
                <Button onClick={() => importSystem(system, false)} size="sm" variant="secondary">
                  Aktywuj core
                </Button>
                <Button onClick={() => importSystem(system, true)} size="sm" variant="ghost">
                  Aktywuj core + advanced
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        tone="elevated"
        title="Generator definicji sygnalu"
        subtitle="Najpierw binarnie. Dopiero potem precyzja."
      >
        <Banner tone="info" title="Zasada projektowania sygnalu">
          Skala 0-10 jest narzedziem. Nie ozdoba.
        </Banner>

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
            Typ sygnalu
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
          <small>To jest lokalna definicja operacyjna dla Ciebie. Aplikacja bedzie ja przypominac w check-inie.</small>
        </label>

        <Button block disabled={!name.trim()} onClick={addCustom} variant="primary">
          Dodaj sygnal do systemu
        </Button>
      </Card>

      <Card
        tone="elevated"
        title="Aktywne sygnaly"
        subtitle="To sygnaly, ktore trafiaja do dziennego Capture i raportow Review."
      >
        <div className="grid grid-3">
          {Array.from(byCategory.entries()).map(([currentCategory, items]) => (
            <Card
              key={currentCategory}
              subtitle={`${items.length} sygnalow`}
              title={currentCategory}
              tone="default"
            >
              <ul>
                {items.map((activity) => (
                  <li key={activity.id}>
                    <span>
                      {activity.name} <small>({activity.type === 'BOOLEAN' ? 'tak/nie' : '0-10'})</small>
                    </span>
                    <Button onClick={() => removeActivity(activity.id)} size="sm" variant="ghost">
                      Archiwizuj
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
