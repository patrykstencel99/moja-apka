'use client';

import Link from 'next/link';
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

type Insight = {
  factor: string;
  direction: 'positive' | 'negative';
  confidence: number;
  lag: 0 | 1;
  explanation: string;
};

type ReportSummary = {
  insufficientData: boolean;
  uniqueDays: number;
  positive: Insight[];
  negative: Insight[];
};

type DecisionCandidate = {
  id: string;
  title: string;
  why: string;
  minimal: string;
};

type VerdictLevel = 'niskie' | 'srednie' | 'wysokie';

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

function isoWeekString(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function moodDescriptor(value: number) {
  if (value <= 3) {
    return 'Niski ton emocjonalny. Zdejmij obciazenie i tnij chaos.';
  }
  if (value <= 6) {
    return 'Stan neutralny. Pilnuj rytmu i prostych decyzji.';
  }
  if (value <= 8) {
    return 'Dobry stan. To okno na ruch o wysokiej wartosci.';
  }
  return 'Wysokie momentum. Trzymaj dyscypline, nie impuls.';
}

function energyDescriptor(value: number) {
  if (value <= 3) {
    return 'Niski zasob. Priorytetem jest ochrona energii.';
  }
  if (value <= 6) {
    return 'Sredni zasob. Pracuj blokami i odcinaj rozproszenia.';
  }
  if (value <= 8) {
    return 'Mocny zasob. Dobry czas na najtrudniejszy ruch.';
  }
  return 'Peak. Zamien zasob w konkretne wykonanie.';
}

function signalPurpose(activity: Activity) {
  if (activity.valenceHint === 'negative') {
    return 'Po co: to sygnal ryzyka. Wylap trigger zanim rozbije dzien.';
  }
  if (activity.valenceHint === 'positive') {
    return 'Po co: to sygnal wzmacniajacy. Powielaj go jako standard.';
  }
  return 'Po co: to sygnal kontrolny. Pomaga odroznic stan od narracji.';
}

function lineFromFactor(factor: string) {
  return factor.replace(/^["']|["']$/g, '').trim();
}

function toDecisionFromInsight(insight: Insight, index: number): DecisionCandidate {
  const factor = lineFromFactor(insight.factor);
  const isRisk = insight.direction === 'negative';
  return {
    id: `insight-${insight.direction}-${index}-${factor}`,
    title: isRisk ? `Jutro: zabezpiecz "${factor}"` : `Jutro: powtorz "${factor}"`,
    why: `Lag ${insight.lag}d, confidence ${insight.confidence}%: ${insight.explanation}`,
    minimal: isRisk
      ? `Wersja 10%: ustaw jedna bariera na "${factor}".`
      : `Wersja 10%: wykonaj 10 minut wersji minimalnej "${factor}".`
  };
}

function stateFallbackDecisions(params: {
  mood: number;
  energy: number;
  selectedNegative: number;
  selectedPositive: number;
}): DecisionCandidate[] {
  const { mood, energy, selectedNegative, selectedPositive } = params;
  const candidates: DecisionCandidate[] = [];

  if (energy <= 4 || selectedNegative >= 2) {
    candidates.push({
      id: 'state-protection',
      title: 'Jutro: zabezpiecz poranek przed zjazdem energii',
      why: 'Sygnały dnia pokazuja ryzyko spadku energii na starcie kolejnego dnia.',
      minimal: 'Wersja 10%: 1 decyzja ochronna rano (woda + brak scrolla przez 30 min).'
    });
  }

  if (mood <= 4) {
    candidates.push({
      id: 'state-friction',
      title: 'Jutro: zmniejsz tarcie decyzyjne',
      why: 'Niski mood czesto zwieksza koszt wejscia w zadania i powoduje odkladanie.',
      minimal: 'Wersja 10%: wybierz 1 priorytet i 15 minut startu bez perfekcjonizmu.'
    });
  }

  if (selectedPositive >= 1 && energy >= 6) {
    candidates.push({
      id: 'state-repeat-win',
      title: 'Jutro: zduplikuj dzisiejszy sygnal dzialajacy',
      why: 'Masz sygnal, ktory wspieral wynik. Utrwal go jako standard.',
      minimal: 'Wersja 10%: odtworz tylko pierwszy krok dzialajacego schematu.'
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      id: 'state-default',
      title: 'Jutro: 60 minut glebokiej pracy przed poludniem',
      why: 'Brak silnych sygnalow ryzyka. Najlepszy ruch to jeden klarowny blok wykonania.',
      minimal: 'Wersja 10%: 10 minut koncentracji bez notyfikacji.'
    });
  }

  return candidates;
}

function dedupeDecisions(candidates: DecisionCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.title)) {
      return false;
    }
    seen.add(candidate.title);
    return true;
  });
}

function computeVerdict(params: { mood: number; energy: number; selectedNegative: number }): {
  level: VerdictLevel;
  line: string;
} {
  const score = Math.max(0, (10 - params.energy) + (params.mood <= 4 ? 2 : 0) + params.selectedNegative * 2);
  if (score >= 10) {
    return { level: 'wysokie', line: 'Verdict: Dzis ryzyko spadku energii jest wysokie.' };
  }
  if (score >= 6) {
    return { level: 'srednie', line: 'Verdict: Dzis ryzyko spadku energii jest srednie.' };
  }
  return { level: 'niskie', line: 'Verdict: Dzis ryzyko spadku energii jest niskie.' };
}

export function DashboardClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [gamification, setGamification] = useState<GamificationStatus | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<ReportSummary | null>(null);
  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [journal, setJournal] = useState('');
  const [fullContext, setFullContext] = useState(false);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [acceptedMove, setAcceptedMove] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [showSkipReason, setShowSkipReason] = useState(false);
  const [verdictVisible, setVerdictVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

  const localDate = useMemo(() => todayLocalDate(), []);

  const load = useCallback(async () => {
    setError(null);
    const week = isoWeekString(new Date());

    const [activitiesRes, checkinsRes, gamRes, weeklyRes] = await Promise.all([
      fetch('/api/systems/activities'),
      fetch(`/api/checkins?from=${localDate}&to=${localDate}`),
      fetch('/api/gamification/status'),
      fetch(`/api/review/weekly?week=${week}`)
    ]);

    if (!activitiesRes.ok || !checkinsRes.ok || !gamRes.ok) {
      setError('Nie udalo sie zsynchronizowac danych dnia.');
      return;
    }

    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    const checkinsData = (await checkinsRes.json()) as { checkIns: CheckIn[] };
    const gamData = (await gamRes.json()) as GamificationStatus;

    setActivities(activitiesData.activities);
    setCheckins(checkinsData.checkIns);
    setGamification(gamData);

    if (weeklyRes.ok) {
      setWeeklyReport((await weeklyRes.json()) as ReportSummary);
    }

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
        setSyncInfo(`Wpisy offline zsynchronizowane: ${result.sent} wpisow.`);
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

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50)),
    [activities]
  );
  const topSignals = useMemo(() => sortedActivities.slice(0, 5), [sortedActivities]);
  const coreSignals = useMemo(() => topSignals.slice(0, 3), [topSignals]);
  const extraSignals = useMemo(() => topSignals.slice(3), [topSignals]);
  const additionalSignals = useMemo(() => sortedActivities.slice(5), [sortedActivities]);

  const selectedNegative = useMemo(
    () =>
      topSignals.filter((activity) => {
        if (activity.valenceHint !== 'negative') {
          return false;
        }
        const value = values[activity.id];
        if (activity.type === 'BOOLEAN') {
          return Boolean(value);
        }
        return Number(value ?? 0) >= 7;
      }).length,
    [topSignals, values]
  );

  const selectedPositive = useMemo(
    () =>
      topSignals.filter((activity) => {
        if (activity.valenceHint !== 'positive') {
          return false;
        }
        const value = values[activity.id];
        if (activity.type === 'BOOLEAN') {
          return Boolean(value);
        }
        return Number(value ?? 0) >= 7;
      }).length,
    [topSignals, values]
  );

  const decisionCandidates = useMemo(() => {
    const insightBased: DecisionCandidate[] = [];

    if (weeklyReport && !weeklyReport.insufficientData) {
      for (const [index, insight] of weeklyReport.negative.slice(0, 2).entries()) {
        insightBased.push(toDecisionFromInsight(insight, index));
      }
      for (const [index, insight] of weeklyReport.positive.slice(0, 1).entries()) {
        insightBased.push(toDecisionFromInsight(insight, index + 2));
      }
    }

    const fallback = stateFallbackDecisions({
      mood,
      energy,
      selectedNegative,
      selectedPositive
    });

    return dedupeDecisions([...insightBased, ...fallback]).slice(0, 3);
  }, [weeklyReport, mood, energy, selectedNegative, selectedPositive]);

  useEffect(() => {
    if (decisionIndex >= decisionCandidates.length) {
      setDecisionIndex(0);
    }
  }, [decisionIndex, decisionCandidates.length]);

  const currentDecision =
    decisionCandidates[decisionIndex] ??
    ({
      id: 'fallback',
      title: 'Jutro: jeden ruch o wysokiej wartosci',
      why: 'Brak wystarczajacych sygnalow. Uzyj najprostszego eksperymentu i zbieraj dane dalej.',
      minimal: 'Wersja 10%: 10 minut wykonania.'
    } satisfies DecisionCandidate);

  const verdict = useMemo(
    () =>
      computeVerdict({
        mood,
        energy,
        selectedNegative
      }),
    [mood, energy, selectedNegative]
  );

  const submitCheckIn = async () => {
    setError(null);
    setInfo(null);
    setShowSkipReason(false);

    const clientEventId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    const selectedIds = fullContext ? activities.map((activity) => activity.id) : topSignals.map((activity) => activity.id);
    const selectedIdSet = new Set(selectedIds);

    const payload = {
      localDate,
      timestamp: new Date().toISOString(),
      mood,
      energy,
      journal,
      clientEventId,
      values: activities
        .filter((activity) => selectedIdSet.has(activity.id))
        .map((activity) => {
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
      setVerdictVisible(true);
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

    setInfo('Zamkniete. Jutro bedzie latwiejsze.');
    setJournal('');
    setVerdictVisible(true);
    await load();
  };

  const entriesToday = checkins.length;

  return (
    <div className="stack-lg">
      <section className="flow-track" aria-label="Flow decyzji">
        <div className="flow-step is-active">
          <span>1</span>
          <div>
            <strong>Capture (60s)</strong>
            <small>Zbierz sygnaly.</small>
          </div>
        </div>
        <div className="flow-step is-active">
          <span>2</span>
          <div>
            <strong>Decide (10s)</strong>
            <small>Wybierz Next Move.</small>
          </div>
        </div>
        <div className="flow-step">
          <span>3</span>
          <div>
            <strong>Review</strong>
            <small>Tydzien / miesiac / rok.</small>
          </div>
        </div>
      </section>

      <section className="control-bar">
        <StatTile
          label="Dzisiaj"
          value={new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long' })}
          hint="Tryb 1x: jedyny ekran akcji"
        />
        <StatTile
          label="Streak"
          value={gamification?.currentStreak ?? 0}
          hint={`Best ${gamification?.bestStreak ?? 0}`}
          trend={(gamification?.currentStreak ?? 0) >= 7 ? 'up' : 'neutral'}
        />
        <StatTile
          label="Wpisy dzisiaj"
          value={entriesToday}
          hint="Capture zamykasz jednym check-inem"
          trend={entriesToday === 0 ? 'down' : 'up'}
        />
        <StatTile
          label="Tryb"
          value={fullContext ? 'Full context' : '60 sekund'}
          hint="Domyslnie szybko, pelen kontekst opcjonalny"
        />
      </section>

      {syncInfo && (
        <Banner tone="info" title="Synchronizacja">
          {syncInfo}
        </Banner>
      )}

      {info && (
        <Banner tone="success" title="Status">
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
        title="Capture: Dzisiaj liczy sie precyzja, nie heroizm."
        subtitle="Jedno klikniecie = jedna intencja. Zbierasz sygnal, nie wypelniasz aplikacji."
        actions={
          <div className="mode-switch">
            <button className={fullContext ? '' : 'active'} onClick={() => setFullContext(false)} type="button">
              60 sekund
            </button>
            <button className={fullContext ? 'active' : ''} onClick={() => setFullContext(true)} type="button">
              Full context
            </button>
          </div>
        }
      >
        <div className="grid grid-2">
          <RangeField
            descriptor={moodDescriptor(mood)}
            label="Mood"
            max={10}
            min={1}
            onChange={(event) => setMood(Number(event.target.value))}
            value={mood}
          />
          <RangeField
            descriptor={energyDescriptor(energy)}
            label="Energy"
            max={10}
            min={1}
            onChange={(event) => setEnergy(Number(event.target.value))}
            value={energy}
          />
        </div>

        <small>Zapisujesz sygnal. Nie ocene.</small>

        <div className="grid grid-3">
          {coreSignals.map((activity) =>
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
                subtitle={signalPurpose(activity)}
                title={activity.name}
              />
            ) : (
              <Card key={activity.id} subtitle={signalPurpose(activity)} title={activity.name}>
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

        {(extraSignals.length > 0 || additionalSignals.length > 0) && (
          <details className="capture-more">
            <summary>Wiecej sygnalow (opcjonalnie)</summary>
            <div className="stack">
              {extraSignals.length > 0 && (
                <div className="grid grid-2">
                  {extraSignals.map((activity) =>
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
                        subtitle={signalPurpose(activity)}
                        title={activity.name}
                      />
                    ) : (
                      <Card key={activity.id} subtitle={signalPurpose(activity)} title={activity.name}>
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
              )}

              {fullContext && additionalSignals.length > 0 && (
                <div className="grid grid-2">
                  {additionalSignals.map((activity) =>
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
                        subtitle={signalPurpose(activity)}
                        title={activity.name}
                      />
                    ) : (
                      <Card key={activity.id} subtitle={signalPurpose(activity)} title={activity.name}>
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
              )}
            </div>
          </details>
        )}

        <label className="stack-sm">
          Sytuacja / wyzwalacz / decyzja
          <input
            onChange={(event) => setJournal(event.target.value)}
            placeholder="np. Sytuacja: pozna kawa. Decyzja: bez kofeiny po 15:00."
            value={journal}
          />
          <small>Ultra krotko. Fakty i decyzja, bez narracji.</small>
        </label>

        <Button block onClick={submitCheckIn} size="lg" variant="primary">
          Zapisz i pokaz kolejny krok
        </Button>
      </Card>

      <Card
        tone="strong"
        title="Kolejny krok na jutro"
        subtitle="Jedna decyzja. Jedna korekta. Jeden eksperyment."
      >
        <p className="decision-title">{currentDecision.title}</p>
        <small>{currentDecision.why}</small>
        <div className="panel-subtle">
          <strong>Wariant minimalny</strong>
          <small>{currentDecision.minimal}</small>
        </div>

        <div className="decision-actions">
          <Button
            onClick={() => {
              setAcceptedMove(currentDecision.title);
              setShowSkipReason(false);
              setSkipReason('');
            }}
            size="sm"
            variant="primary"
          >
            Biore
          </Button>
          <Button
            onClick={() => setDecisionIndex((prev) => (prev + 1) % Math.max(decisionCandidates.length, 1))}
            size="sm"
            variant="ghost"
          >
            Zamien
          </Button>
          <Button
            onClick={() => {
              setShowSkipReason(true);
              setAcceptedMove(null);
            }}
            size="sm"
            variant="secondary"
          >
            Nie dzis
          </Button>
        </div>

        {acceptedMove && (
          <Banner tone="success" title="Eksperyment ustawiony">
            {acceptedMove}
          </Banner>
        )}

        {showSkipReason && (
          <label className="stack-sm">
            Dlaczego nie dzis?
            <select onChange={(event) => setSkipReason(event.target.value)} value={skipReason}>
              <option value="">Wybierz powod</option>
              <option value="za-duzy-koszt">Za duzy koszt wdrozenia</option>
              <option value="nieadekwatne-do-jutra">Nieadekwatne do planu jutra</option>
              <option value="potrzebuje-latwiejszej-wersji">Potrzebuje latwiejszej wersji</option>
            </select>
            {skipReason && <small>Feedback zapisany. Kolejna rekomendacja bedzie prostsza.</small>}
          </label>
        )}

        {verdictVisible && (
          <div className={`daily-verdict daily-verdict--${verdict.level}`}>
            <p>{verdict.line}</p>
            <small>Jeden ruch: {currentDecision.title.replace(/^Jutro:\s*/, '')}</small>
            <small>Wersja minimalna: {currentDecision.minimal}</small>
          </div>
        )}
      </Card>

      <Card
        tone="elevated"
        title="Przeglad: historia dnia"
        subtitle="Podglad wpisow bez dodatkowych akcji."
      >
        <details>
          <summary>Zobacz historie check-inow</summary>
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
                      <strong>
                        {new Date(entry.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                      {' • '}nastroj {entry.mood} • energia {entry.energy}
                    </p>
                    {entry.journal && <small>{entry.journal}</small>}
                  </div>
                ))}
            </div>
          )}
        </details>

        <div className="review-cta-row">
          <small>Nie optymalizujesz dnia. Stabilizujesz tydzien.</small>
          <Link className="review-link" href="/review">
            Otworz Przeglad
          </Link>
        </div>
      </Card>
    </div>
  );
}
