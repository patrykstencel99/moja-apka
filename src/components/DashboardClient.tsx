'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxTile } from '@/components/ui/CheckboxTile';
import { RangeField } from '@/components/ui/RangeField';
import { StatTile } from '@/components/ui/StatTile';
import { enqueueCheckIn, flushQueuedCheckIns } from '@/lib/offline-queue';

type Activity = {
  id: string;
  name: string;
  category: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  iconKey?: string;
  priority?: number;
  valenceHint?: 'positive' | 'negative' | 'neutral';
};

type CheckIn = {
  id: string;
  localDate: string;
  mood: number;
  energy: number;
  journal: string | null;
  createdAt: string;
};

type GamificationStatus = {
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  totalXp: number;
  level: number;
  avgEntriesPerDay: number;
};

type CheckMode = 'quick' | 'full';

const ICON_LABEL: Record<string, string> = {
  moon: 'SN',
  fork: 'OD',
  bolt: 'EN',
  dumbbell: 'TR',
  briefcase: 'PR',
  glass: 'UZ',
  journal: 'JR',
  pulse: 'PT'
};

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function moodDescriptor(value: number) {
  if (value <= 3) {
    return 'Niski ton emocjonalny — traktuj dzien taktycznie i ogranicz chaos.';
  }
  if (value <= 6) {
    return 'Neutralnie — utrzymaj stabilne tempo i precyzje decyzji.';
  }
  if (value <= 8) {
    return 'Dobry stan — to okno na decyzje o wysokiej wartosci.';
  }
  return 'Wysoki ton — wykorzystaj momentum, ale bez impulsywnosci.';
}

function energyDescriptor(value: number) {
  if (value <= 3) {
    return 'Niski zasob — priorytetem jest regeneracja i minimum krytyczne.';
  }
  if (value <= 6) {
    return 'Sredni zasob — pracuj blokami i tnij dystraktory.';
  }
  if (value <= 8) {
    return 'Mocny zasob — dobry czas na najtrudniejsze zadanie dnia.';
  }
  return 'Peak — trzymaj discipline i zamien energie w wykonanie.';
}

function quickStatus(entriesToday: number) {
  if (entriesToday === 0) {
    return 'Brak wpisu dzisiaj';
  }
  if (entriesToday < 3) {
    return `Postep dzisiaj: ${entriesToday}/3`; 
  }
  return 'Cel dzienny zrealizowany';
}

export function DashboardClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [gamification, setGamification] = useState<GamificationStatus | null>(null);
  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [journal, setJournal] = useState('');
  const [mode, setMode] = useState<CheckMode>('quick');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Wszystkie');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

  const localDate = useMemo(() => todayLocalDate(), []);

  const load = useCallback(async () => {
    setError(null);

    const [activitiesRes, checkinsRes, gamRes] = await Promise.all([
      fetch('/api/setup/activities'),
      fetch(`/api/checkins?from=${localDate}&to=${localDate}`),
      fetch('/api/gamification/status')
    ]);

    if (!activitiesRes.ok || !checkinsRes.ok || !gamRes.ok) {
      setError('Nie udalo sie zsynchronizowac danych dashboardu.');
      return;
    }

    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    const checkinsData = (await checkinsRes.json()) as { checkIns: CheckIn[] };
    const gamData = (await gamRes.json()) as GamificationStatus;

    setActivities(activitiesData.activities);
    setCheckins(checkinsData.checkIns);
    setGamification(gamData);

    setValues((prev) => {
      const next: Record<string, number | boolean> = { ...prev };
      for (const activity of activitiesData.activities) {
        if (next[activity.id] !== undefined) {
          continue;
        }
        next[activity.id] = activity.type === 'BOOLEAN' ? false : 0;
      }
      return next;
    });
  }, [localDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) {
        return;
      }
      const result = await flushQueuedCheckIns();
      if (result.sent > 0) {
        setSyncInfo(`Offline queue zsynchronizowana: ${result.sent} wpisow.`);
        await load();
      }
    };

    void sync();

    const onOnline = () => {
      void sync();
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [load]);

  const categories = useMemo(
    () => ['Wszystkie', ...Array.from(new Set(activities.map((activity) => activity.category)))],
    [activities]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activities
      .filter((activity) => (category === 'Wszystkie' ? true : activity.category === category))
      .filter((activity) =>
        normalizedQuery.length === 0
          ? true
          : `${activity.name} ${activity.category}`.toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  }, [activities, category, query]);

  const visibleActivities = useMemo(() => {
    if (mode === 'quick') {
      const quickPool = filtered.length > 0 ? filtered : activities;
      return [...quickPool].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50)).slice(0, 8);
    }
    return filtered;
  }, [mode, filtered, activities]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of visibleActivities) {
      const list = map.get(activity.category) ?? [];
      list.push(activity);
      map.set(activity.category, list);
    }
    return map;
  }, [visibleActivities]);

  const submitCheckIn = async () => {
    setError(null);
    setInfo(null);

    const clientEventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const payload = {
      localDate,
      timestamp: new Date().toISOString(),
      mood,
      energy,
      journal,
      clientEventId,
      values: activities.map((activity) => {
        if (activity.type === 'BOOLEAN') {
          return {
            activityId: activity.id,
            booleanValue: Boolean(values[activity.id])
          };
        }

        return {
          activityId: activity.id,
          numericValue: Number(values[activity.id] ?? 0)
        };
      })
    };

    if (!navigator.onLine) {
      await enqueueCheckIn({
        clientEventId,
        createdAt: Date.now(),
        payload
      });

      setInfo('Tryb offline: wpis zapisany lokalnie i wysle sie po reconnect.');
      setJournal('');
      setCheckins((prev) => [
        ...prev,
        {
          id: `offline-${clientEventId}`,
          localDate,
          mood,
          energy,
          journal,
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    const response = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Nie udalo sie zapisac wpisu.');
      return;
    }

    setInfo('Check-in zapisany.');
    setJournal('');
    await load();
  };

  const entriesToday = checkins.length;
  const hasTodayEntry = entriesToday > 0;

  return (
    <div className="stack-lg">
      <section className="control-bar">
        <StatTile
          label="Dzisiaj"
          value={new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long' })}
          hint="Lokalny rytm dnia"
        />
        <StatTile
          label="Current streak"
          value={gamification?.currentStreak ?? 0}
          hint={`Best: ${gamification?.bestStreak ?? 0}`}
          trend={(gamification?.currentStreak ?? 0) >= 7 ? 'up' : 'neutral'}
        />
        <StatTile
          label="Poziom"
          value={gamification?.level ?? 1}
          hint={`XP ${gamification?.totalXp ?? 0}`}
          trend={(gamification?.level ?? 1) >= 3 ? 'up' : 'neutral'}
        />
        <StatTile
          label="Quick status"
          value={quickStatus(entriesToday)}
          hint="Cel: 3 punkty kontrolne"
          trend={entriesToday === 0 ? 'down' : entriesToday >= 3 ? 'up' : 'neutral'}
        />
      </section>

      {!hasTodayEntry && (
        <Banner tone="warning" title="Brakuje dzisiejszego wpisu">
          Zostaw przynajmniej jeden check-in, aby utrzymac ciaglosc systemu.
        </Banner>
      )}

      {syncInfo && (
        <Banner tone="info" title="Synchronizacja">
          {syncInfo}
        </Banner>
      )}

      {info && (
        <Banner tone="success" title="Status zapisu">
          {info}
        </Banner>
      )}

      {error && (
        <Banner tone="danger" title="Problem zapisu">
          {error}
        </Banner>
      )}

      <Card
        tone="elevated"
        title="Check-in dnia"
        subtitle="Tryb quick zamyka wpis w 60 sekund. Tryb full daje pelny kontekst do raportu."
        actions={
          <div className="mode-switch">
            <button className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')} type="button">
              Quick (60s)
            </button>
            <button className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')} type="button">
              Full context
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <RangeField descriptor={moodDescriptor(mood)} label="Mood" max={10} min={1} onChange={(event) => setMood(Number(event.target.value))} value={mood} />
          <RangeField descriptor={energyDescriptor(energy)} label="Energy" max={10} min={1} onChange={(event) => setEnergy(Number(event.target.value))} value={energy} />
        </div>

        {mode === 'full' && (
          <div className="filter-row">
            <label className="stack-sm">
              Znajdz aktywnosc
              <input onChange={(event) => setQuery(event.target.value)} placeholder="np. trening, sen, kawa" value={query} />
            </label>
            <label className="stack-sm">
              Kategoria
              <select onChange={(event) => setCategory(event.target.value)} value={category}>
                {categories.map((currentCategory) => (
                  <option key={currentCategory} value={currentCategory}>
                    {currentCategory}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {visibleActivities.length === 0 ? (
          <div className="empty-state">Brak aktywnosci dla aktualnego filtra. Zmien filtr albo dodaj sygnal w zakladce Setup.</div>
        ) : mode === 'quick' ? (
          <div className="grid grid-2">
            {visibleActivities.map((activity) =>
              activity.type === 'BOOLEAN' ? (
                <CheckboxTile
                  checked={Boolean(values[activity.id])}
                  icon={ICON_LABEL[activity.iconKey ?? 'pulse'] ?? 'PT'}
                  key={activity.id}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [activity.id]: event.target.checked
                    }))
                  }
                  subtitle={`Priorytet ${(activity.priority ?? 50).toString()}`}
                  title={activity.name}
                />
              ) : (
                <Card
                  key={activity.id}
                  subtitle={`Priorytet ${(activity.priority ?? 50).toString()} • Skala 0-10`}
                  title={activity.name}
                >
                  <RangeField
                    label="Intensywnosc"
                    max={10}
                    min={0}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [activity.id]: Number(event.target.value)
                      }))
                    }
                    value={Number(values[activity.id] ?? 0)}
                  />
                </Card>
              )
            )}
          </div>
        ) : (
          <div className="stack">
            {Array.from(groupedByCategory.entries()).map(([currentCategory, currentActivities]) => (
              <Card
                key={currentCategory}
                subtitle={`${currentActivities.length} sygnalow`}
                title={currentCategory}
                tone="default"
              >
                <div className="grid grid-2">
                  {currentActivities.map((activity) =>
                    activity.type === 'BOOLEAN' ? (
                      <CheckboxTile
                        checked={Boolean(values[activity.id])}
                        icon={ICON_LABEL[activity.iconKey ?? 'pulse'] ?? 'PT'}
                        key={activity.id}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            [activity.id]: event.target.checked
                          }))
                        }
                        subtitle={activity.valenceHint === 'negative' ? 'Ryzyko petli' : 'Sygnał kontrolny'}
                        title={activity.name}
                      />
                    ) : (
                      <Card key={activity.id} subtitle="Skala 0-10" title={activity.name}>
                        <RangeField
                          label="Intensywnosc"
                          max={10}
                          min={0}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              [activity.id]: Number(event.target.value)
                            }))
                          }
                          value={Number(values[activity.id] ?? 0)}
                        />
                      </Card>
                    )
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <label className="stack-sm">
          Reflection prompt
          <textarea
            onChange={(event) => setJournal(event.target.value)}
            placeholder="Co dzisiaj uruchomilo petle, a co pomoglo odzyskac kontrole?"
            value={journal}
          />
          <small>Krotki zapis faktow i decyzji. Bez narracji, tylko sygnaly i wnioski.</small>
        </label>

        <Button block onClick={submitCheckIn} size="lg" variant="primary">
          Zapisz check-in
        </Button>
      </Card>

      <Card
        tone="elevated"
        title="Dziennik dnia"
        subtitle="Historia dzisiejszych wpisow w kolejnosci czasowej."
      >
        {checkins.length === 0 ? (
          <div className="empty-state">Brak wpisow dzisiaj. Pierwszy check-in uruchamia analityke dnia.</div>
        ) : (
          <div className="timeline">
            {checkins
              .slice()
              .reverse()
              .map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <p>
                    <strong>{new Date(entry.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</strong>
                    {' • '}mood {entry.mood} • energy {entry.energy}
                  </p>
                  {entry.journal && <small>{entry.journal}</small>}
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
