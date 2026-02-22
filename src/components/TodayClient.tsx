'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxTile } from '@/components/ui/CheckboxTile';
import { RangeField } from '@/components/ui/RangeField';
import { StatTile } from '@/components/ui/StatTile';
import { enqueueCheckIn, flushQueuedCheckIns } from '@/lib/offline-queue';
import { buildNextMove, type GeneratedNextMove, type NextMoveInputSignal } from '@/lib/state/next-move';
import {
  STORAGE_KEYS,
  appendExperiment,
  readActiveNextMove,
  readBoolean,
  type NextMoveRecord,
  writeActiveNextMove
} from '@/lib/state/local-storage';

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

type CheckInsResponse = {
  checkIns: CheckIn[];
};

type GamificationStatus = {
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  totalXp: number;
  level: number;
  avgEntriesPerDay: number;
};

type DailyVerdict = {
  level: 'niskie' | 'srednie' | 'wysokie';
  line: string;
  oneMove: string;
  minimalVariant: string;
};

type Props = {
  onboardingMode?: boolean;
};

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

const SKIP_REASON_OPTIONS: Array<{ id: NextMoveRecord['skipReason']; label: string }> = [
  { id: 'brak-czasu', label: 'Brak czasu' },
  { id: 'zly-moment', label: 'Zly moment' },
  { id: 'niska-wiara', label: 'Niska wiara w efekt' }
];

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function signalPurpose(activity: Activity) {
  if (activity.valenceHint === 'negative') {
    return 'Po co to: sygnal ryzyka. Wylap trigger zanim rozbije dzien.';
  }
  if (activity.valenceHint === 'positive') {
    return 'Po co to: sygnal wzmacniajacy. Powielaj go jako standard.';
  }
  return 'Po co to: sygnal kontrolny. Pomaga odroznic stan od narracji.';
}

function buildVerdict(params: {
  mood: number;
  energy: number;
  signals: NextMoveInputSignal[];
  move: GeneratedNextMove;
}): DailyVerdict {
  const negativeHits = params.signals.filter(
    (signal) =>
      (signal.type === 'BOOLEAN' && signal.booleanValue && signal.valenceHint === 'negative') ||
      (signal.type === 'NUMERIC_0_10' && (signal.numericValue ?? 0) >= 7 && signal.valenceHint !== 'positive')
  ).length;

  const score = Math.max(0, 10 - params.energy) + (params.mood <= 4 ? 2 : 0) + negativeHits * 2;
  if (score >= 10) {
    return {
      level: 'wysokie',
      line: 'Verdict: Dzis ryzyko spadku energii jest wysokie.',
      oneMove: params.move.title,
      minimalVariant: params.move.minimalVariant
    };
  }

  if (score >= 6) {
    return {
      level: 'srednie',
      line: 'Verdict: Dzis ryzyko spadku energii jest srednie.',
      oneMove: params.move.title,
      minimalVariant: params.move.minimalVariant
    };
  }

  return {
    level: 'niskie',
    line: 'Verdict: Dzis ryzyko spadku energii jest niskie.',
    oneMove: params.move.title,
    minimalVariant: params.move.minimalVariant
  };
}

export function TodayClient({ onboardingMode = false }: Props) {
  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [gamification, setGamification] = useState<GamificationStatus | null>(null);

  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [journal, setJournal] = useState('');

  const [captureOpen, setCaptureOpen] = useState(onboardingMode);
  const [showTopFive, setShowTopFive] = useState(false);
  const [fullContext, setFullContext] = useState(false);
  const [pendingMove, setPendingMove] = useState<GeneratedNextMove | null>(null);
  const [activeMove, setActiveMove] = useState<NextMoveRecord | null>(null);
  const [showSkipReasons, setShowSkipReasons] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [lastSignals, setLastSignals] = useState<NextMoveInputSignal[]>([]);
  const [dailyVerdict, setDailyVerdict] = useState<DailyVerdict | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

  const localDate = useMemo(() => todayLocalDate(), []);

  useEffect(() => {
    setActiveMove(readActiveNextMove());
    if (!onboardingMode) {
      const quickDefault = readBoolean(STORAGE_KEYS.quickDefault, true);
      setCaptureOpen(quickDefault);
    }
  }, [onboardingMode]);

  const load = useCallback(async () => {
    setError(null);

    const [activitiesRes, checkinsRes, gamRes] = await Promise.all([
      fetch('/api/setup/activities'),
      fetch(`/api/checkins?from=${localDate}&to=${localDate}`),
      fetch('/api/gamification/status')
    ]);

    if (!activitiesRes.ok || !checkinsRes.ok || !gamRes.ok) {
      setError('Nie udalo sie zsynchronizowac danych dnia.');
      return;
    }

    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    const checkinsData = (await checkinsRes.json()) as CheckInsResponse;
    const gamData = (await gamRes.json()) as GamificationStatus;

    setActivities(activitiesData.activities);
    setCheckins(checkinsData.checkIns);
    setGamification(gamData);

    setValues((prev) => {
      const next = { ...prev };
      for (const activity of activitiesData.activities) {
        if (next[activity.id] === undefined) {
          next[activity.id] = activity.type === 'BOOLEAN' ? false : 0;
        }
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

    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [load]);

  const prioritizedActivities = useMemo(
    () => [...activities].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50)),
    [activities]
  );

  const topCoreSignals = useMemo(() => prioritizedActivities.slice(0, 3), [prioritizedActivities]);
  const optionalSignals = useMemo(() => prioritizedActivities.slice(3, 5), [prioritizedActivities]);
  const advancedSignals = useMemo(() => prioritizedActivities.slice(5), [prioritizedActivities]);

  const captureScope = useMemo(() => {
    if (fullContext) {
      return prioritizedActivities;
    }
    if (showTopFive) {
      return [...topCoreSignals, ...optionalSignals];
    }
    return topCoreSignals;
  }, [fullContext, prioritizedActivities, showTopFive, topCoreSignals, optionalSignals]);

  const captureSignals = useMemo<NextMoveInputSignal[]>(
    () =>
      captureScope.map((activity) => ({
        name: activity.name,
        type: activity.type,
        booleanValue: activity.type === 'BOOLEAN' ? Boolean(values[activity.id]) : undefined,
        numericValue: activity.type === 'NUMERIC_0_10' ? Number(values[activity.id] ?? 0) : undefined,
        valenceHint: activity.valenceHint
      })),
    [captureScope, values]
  );

  const entriesToday = checkins.length;
  const hasTodayEntry = entriesToday > 0;

  const submitCheckIn = async () => {
    if (activities.length === 0) {
      setError('Brak aktywnych sygnalow. Wybierz system przed check-inem.');
      return;
    }

    setError(null);
    setInfo(null);

    const clientEventId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    const selectedIds = new Set(captureScope.map((activity) => activity.id));
    const payload = {
      localDate,
      timestamp: new Date().toISOString(),
      mood,
      energy,
      journal,
      clientEventId,
      values: activities
        .filter((activity) => selectedIds.has(activity.id))
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
    } else {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? 'Nie udalo sie zapisac check-in.');
        return;
      }

      await load();
    }

    setJournal('');
    setShowSkipReasons(false);
    setVariantIndex(0);
    setLastSignals(captureSignals);

    const suggestion = buildNextMove({ mood, energy, signals: captureSignals, variantIndex: 0 });
    setPendingMove(suggestion);
    setDailyVerdict(
      buildVerdict({
        mood,
        energy,
        signals: captureSignals,
        move: suggestion
      })
    );
    setCaptureOpen(false);
    setInfo('Zamkniete. Jutro bedzie latwiejsze.');
  };

  const finalizeDecision = async (decision: NextMoveRecord['decision'], skipReason?: NextMoveRecord['skipReason']) => {
    if (!pendingMove) {
      return;
    }

    const record: NextMoveRecord = {
      id: pendingMove.id,
      title: pendingMove.title,
      why: pendingMove.why,
      minimalVariant: pendingMove.minimalVariant,
      confidence: pendingMove.confidence,
      lag: pendingMove.lag,
      createdAt: new Date().toISOString(),
      localDate,
      decision,
      skipReason
    };

    appendExperiment(record);

    if (decision === 'skipped') {
      writeActiveNextMove(null);
      setActiveMove(null);
      setInfo('Decyzja odlozona. Jutro system podsunie nowy Next Move.');
    } else {
      writeActiveNextMove(record);
      setActiveMove(record);
      setInfo('Next Move ustawione. Petla dnia zamknieta.');
    }

    setPendingMove(null);
    setShowSkipReasons(false);

    if (onboardingMode) {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      router.push('/today');
      router.refresh();
    }
  };

  const swapDecision = () => {
    const nextVariant = variantIndex + 1;
    setVariantIndex(nextVariant);

    const suggestion = buildNextMove({
      mood,
      energy,
      signals: lastSignals.length > 0 ? lastSignals : captureSignals,
      variantIndex: nextVariant
    });

    const scopeSignals = lastSignals.length > 0 ? lastSignals : captureSignals;
    setPendingMove(suggestion);
    setDailyVerdict(
      buildVerdict({
        mood,
        energy,
        signals: scopeSignals,
        move: suggestion
      })
    );
    setInfo('Pokazalem wariant alternatywny.');
  };

  const renderSignalInput = (activity: Activity) => {
    if (activity.type === 'BOOLEAN') {
      return (
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
      );
    }

    return (
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
    );
  };

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

      {activities.length === 0 && (
        <Banner tone="warning" title="Brak aktywnych sygnalow">
          Wybierz system (2 min), aby uruchomic codzienny check-in. <Link href="/systems">Przejdz do Systemow</Link>
        </Banner>
      )}

      {!hasTodayEntry && !onboardingMode && (
        <Banner tone="warning" title="Brakuje dzisiejszego wpisu">
          Dodaj minimum 1 check-in, aby utrzymac streak.
        </Banner>
      )}

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
        <Banner tone="danger" title="Problem">
          {error}
        </Banner>
      )}

      {!onboardingMode && (
        <Card tone="elevated" title="Status dnia" subtitle="Mini kontrola postepu bez wodotryskow.">
          <div className="grid grid-3 compact-grid">
            <StatTile label="Postep dzisiaj" value={`${Math.min(entriesToday, 3)}/3`} hint="Cel: 3 wpisy" />
            <StatTile
              label="Streak"
              value={gamification?.currentStreak ?? 0}
              hint={`Best ${gamification?.bestStreak ?? 0}`}
              trend={(gamification?.currentStreak ?? 0) >= 7 ? 'up' : 'neutral'}
            />
            <StatTile label="Poziom" value={gamification?.level ?? 1} hint={`XP ${gamification?.totalXp ?? 0}`} />
          </div>
        </Card>
      )}

      <Card
        tone="elevated"
        title="Capture: Dzisiaj liczy sie precyzja, nie heroizm."
        subtitle="Tryb domyslny: 60 sekund. Full context to opcja, nie standard."
        actions={
          <div className="mode-switch">
            <button
              className={fullContext ? '' : 'active'}
              onClick={() => {
                setFullContext(false);
                setShowTopFive(false);
              }}
              type="button"
            >
              60 sekund
            </button>
            <button className={fullContext ? 'active' : ''} onClick={() => setFullContext(true)} type="button">
              Full context
            </button>
          </div>
        }
      >
        {!captureOpen ? (
          <div className="stack-sm">
            <p>Glowna akcja dnia: jeden szybki check-in i jedna decyzja na jutro.</p>
            <Button onClick={() => setCaptureOpen(true)} size="lg" variant="primary">
              Zrob check-in (60s)
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-2">
              <RangeField
                descriptor="1 = rozchwianie, 10 = stabilny nastroj"
                label="Mood"
                max={10}
                min={1}
                onChange={(event) => setMood(Number(event.target.value))}
                value={mood}
              />
              <RangeField
                descriptor="1 = niski zasob, 10 = wysoka sprawczosc"
                label="Energy"
                max={10}
                min={1}
                onChange={(event) => setEnergy(Number(event.target.value))}
                value={energy}
              />
            </div>

            <small>Zapisujesz sygnal. Nie ocene.</small>

            <div className="stack-sm">
              <strong>Top 3 sygnaly dnia</strong>
              <div className="grid grid-3">{topCoreSignals.map((activity) => renderSignalInput(activity))}</div>
            </div>

            {!fullContext && optionalSignals.length > 0 && (
              <div className="stack-sm">
                <Button onClick={() => setShowTopFive((value) => !value)} size="sm" type="button" variant="ghost">
                  {showTopFive ? 'Pokaz tylko top 3' : 'Dodaj sygnaly 4-5'}
                </Button>
                {showTopFive && <div className="grid grid-2">{optionalSignals.map((activity) => renderSignalInput(activity))}</div>}
              </div>
            )}

            {fullContext && advancedSignals.length > 0 && (
              <details className="capture-more" open>
                <summary>Dodatkowy kontekst</summary>
                <div className="grid grid-2">{advancedSignals.map((activity) => renderSignalInput(activity))}</div>
              </details>
            )}

            <label className="stack-sm">
              Fakt / trigger / decyzja
              <input
                maxLength={240}
                onChange={(event) => setJournal(event.target.value)}
                placeholder="np. Trigger: pozna kawa. Decyzja: bez kofeiny po 15:00."
                value={journal}
              />
            </label>

            <Button block onClick={submitCheckIn} size="lg" variant="primary">
              Zapisz i pokaz Next Move
            </Button>
          </>
        )}
      </Card>

      <Card
        tone="strong"
        title="Decide: Next Move na jutro"
        subtitle={pendingMove ? 'Po check-inie zawsze podejmujesz decyzje.' : 'Jedna decyzja. Jedna korekta.'}
      >
        {pendingMove ? (
          <div className="stack">
            <div className="panel-subtle">
              <p className="decision-title">{pendingMove.title}</p>
              <small>
                Dlaczego: {pendingMove.why} (confidence {pendingMove.confidence}% • lag {pendingMove.lag}d)
              </small>
              <small>Wariant minimalny (10%): {pendingMove.minimalVariant}</small>
            </div>

            <div className="decision-actions">
              <Button onClick={() => void finalizeDecision('accepted')} variant="primary">
                Biore
              </Button>
              <Button onClick={swapDecision} variant="secondary">
                Zamien
              </Button>
              <Button onClick={() => setShowSkipReasons(true)} variant="ghost">
                Nie dzis
              </Button>
            </div>

            {showSkipReasons && (
              <div className="stack-sm">
                <small>Dlaczego nie dzis?</small>
                <div className="decision-actions">
                  {SKIP_REASON_OPTIONS.map((option) => (
                    <Button
                      key={option.id}
                      onClick={() => void finalizeDecision('skipped', option.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeMove ? (
          <div className="panel-subtle">
            <p>
              <strong>{activeMove.title}</strong>
            </p>
            <small>{activeMove.minimalVariant}</small>
            <small>Next Move ustawione.</small>
          </div>
        ) : (
          <div className="empty-state">
            Brak aktywnego Next Move. Po najblizszym check-inie system zaproponuje jedna korekte.
          </div>
        )}

        {dailyVerdict && (
          <div className={`daily-verdict daily-verdict--${dailyVerdict.level}`}>
            <p>{dailyVerdict.line}</p>
            <small>One move: {dailyVerdict.oneMove}</small>
            <small>Minimal variant: {dailyVerdict.minimalVariant}</small>
          </div>
        )}
      </Card>

      {!onboardingMode && (
        <Card tone="elevated" title="Review: historia dnia" subtitle="Progressive disclosure. Tylko podglad.">
          <details>
            <summary>Zobacz historie check-inow</summary>
            {checkins.length === 0 ? (
              <div className="empty-state">Brak wpisow dzisiaj.</div>
            ) : (
              <div className="timeline">
                {checkins
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div className="timeline-item" key={entry.id}>
                      <p>
                        <strong>{formatTime(entry.createdAt)}</strong> • mood {entry.mood} • energy {entry.energy}
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
              Otworz Review 2x / 5x / 10x
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
