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

type StarterPack = {
  category: string;
  description?: string;
  activities: Array<{
    name: string;
    type: 'BOOLEAN' | 'NUMERIC_0_10';
  }>;
};

export function SetupManager() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [packs, setPacks] = useState<StarterPack[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Wlasne');
  const [type, setType] = useState<'BOOLEAN' | 'NUMERIC_0_10'>('BOOLEAN');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [packsRes, activitiesRes] = await Promise.all([fetch('/api/setup/starter-packs'), fetch('/api/setup/activities')]);

    if (!packsRes.ok || !activitiesRes.ok) {
      setError('Nie udalo sie pobrac danych setupu.');
      return;
    }

    const packsData = (await packsRes.json()) as { packs: StarterPack[] };
    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    setPacks(packsData.packs);
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
      setError(data.error ?? 'Nie udalo sie dodac aktywnosci');
      return;
    }

    setName('');
    setInfo('Nowa aktywnosc dodana do systemu.');
    await load();
  };

  const removeActivity = async (id: string) => {
    setError(null);
    setInfo(null);

    const response = await fetch(`/api/setup/activities/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setError('Nie udalo sie usunac aktywnosci.');
      return;
    }

    setInfo('Aktywnosc zostala przeniesiona do archiwum.');
    await load();
  };

  const importPack = async (pack: StarterPack) => {
    setError(null);
    setInfo(null);

    for (const activity of pack.activities) {
      const exists = activities.some((a) => a.name === activity.name);
      if (exists) {
        continue;
      }
      await fetch('/api/setup/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activity.name,
          category: pack.category,
          type: activity.type
        })
      });
    }

    setInfo(`Pakiet ${pack.category} zostal aktywowany.`);
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
        title="Biblioteka starter packow"
        subtitle="Wybierz gotowy zestaw metryk. Kazdy pakiet opisuje, co dokladnie monitoruje w rytmie dnia."
      >
        <div className="grid grid-3">
          {packs.map((pack) => (
            <Card
              key={pack.category}
              title={pack.category}
              subtitle={pack.description ?? 'Pakiet monitoruje kluczowe sygnaly tego obszaru.'}
              actions={<span className="metric-badge">Sygnaly <strong>{pack.activities.length}</strong></span>}
            >
              <ul>
                {pack.activities.map((activity) => (
                  <li key={activity.name}>
                    {activity.name} <small>({activity.type === 'BOOLEAN' ? 'tak/nie' : 'skala 0-10'})</small>
                  </li>
                ))}
              </ul>
              <Button onClick={() => importPack(pack)} size="sm" variant="secondary">
                Aktywuj pakiet
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        tone="elevated"
        title="Dodaj wlasny sygnal"
        subtitle="Gdy widzisz powtarzalny trigger, dopisz go jako metryke i obserwuj w raportach."
      >
        <div className="grid grid-4">
          <label className="stack-sm">
            Nazwa aktywnosci
            <input onChange={(event) => setName(event.target.value)} placeholder="np. Scroll po 22:00" value={name} />
          </label>

          <label className="stack-sm">
            Kategoria
            <input onChange={(event) => setCategory(event.target.value)} placeholder="np. Regeneracja" value={category} />
          </label>

          <label className="stack-sm">
            Typ sygnalu
            <select onChange={(event) => setType(event.target.value as 'BOOLEAN' | 'NUMERIC_0_10')} value={type}>
              <option value="BOOLEAN">Tak/Nie</option>
              <option value="NUMERIC_0_10">Skala 0-10</option>
            </select>
          </label>

          <div className="stack-sm action-col">
            <span className="eyebrow">Akcja</span>
            <Button block disabled={!name.trim()} onClick={addCustom} variant="primary">
              Dodaj do systemu
            </Button>
          </div>
        </div>
      </Card>

      <Card
        tone="elevated"
        title="Aktywne sygnaly"
        subtitle="To lista metryk, ktore pojawiaja sie w daily check-in i w raporcie wzorcow."
      >
        <div className="grid grid-3">
          {Array.from(byCategory.entries()).map(([currentCategory, items]) => (
            <Card
              key={currentCategory}
              subtitle={`${items.length} aktywnosci`}
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
