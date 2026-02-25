'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxTile } from '@/components/ui/CheckboxTile';
import { RangeField } from '@/components/ui/RangeField';
import { StatTile } from '@/components/ui/StatTile';
import { uiCopy } from '@/lib/copy';
import { enqueueCheckIn, flushQueuedCheckIns } from '@/lib/offline-queue';
import { appendExperiment, readActiveNextMove, type NextMoveRecord, writeActiveNextMove } from '@/lib/state/local-storage';
import { buildNextMove, type GeneratedNextMove, type NextMoveInputSignal } from '@/lib/state/next-move';

type Focus = 'ENERGY' | 'FOCUS' | 'SLEEP';
type CheckinPreference = 'MORNING' | 'EVENING' | 'LATER';

type UserProfile = {
  onboardingComplete: boolean;
  focus: Focus;
  checkinPreference: CheckinPreference;
};

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

type YearDay = {
  localDate: string;
};

type YearMonthRow = {
  key: string;
  label: string;
  days: YearDay[];
};

const SKIP_REASON_OPTIONS: Array<{ id: NextMoveRecord['skipReason']; label: string }> = [
  { id: 'brak-czasu', label: uiCopy.today.skipReasons.noTime },
  { id: 'zly-moment', label: uiCopy.today.skipReasons.outsideControl },
  { id: 'niska-wiara', label: uiCopy.today.skipReasons.lowPriority }
];

const FOCUS_LABEL: Record<Focus, string> = {
  ENERGY: 'Energia',
  FOCUS: 'Skupienie',
  SLEEP: 'Sen'
};

const PREFERENCE_LABEL: Record<CheckinPreference, string> = {
  EVENING: 'Wieczorem',
  MORNING: 'Rano',
  LATER: 'Ustawie pozniej'
};

const QUICK_SIGNAL_BY_FOCUS: Record<Focus, string[]> = {
  ENERGY: [
    'Spadek energii przed 14:00',
    'Pierwszy posilek do 90 min od pobudki',
    'Nawodnienie do poludnia'
  ],
  FOCUS: [
    '60 min glebokiej pracy przed poludniem',
    'Plan jednego priorytetu dnia',
    'Powiadomienia wyciszone podczas bloku'
  ],
  SLEEP: ['Brak ekranu 45 min przed snem', 'Godzina snu zgodna z planem', 'Poranne odswiezenie']
};

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function isLocalDateString(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function buildYearRows(year: number): YearMonthRow[] {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthDate = new Date(year, monthIndex, 1);
    const label = monthDate.toLocaleDateString('pl-PL', { month: 'short' });
    const days = Array.from({ length: daysInMonth }, (_, dayOffset) => {
      const day = dayOffset + 1;
      const localDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { localDate };
    });

    return {
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label,
      days
    };
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function readProfilePayload(data: unknown): UserProfile | null {
  if (typeof data !== 'object' || !data) {
    return null;
  }

  const obj = data as Partial<UserProfile>;
  if (!obj.focus || !obj.checkinPreference || typeof obj.onboardingComplete !== 'boolean') {
    return null;
  }

  return {
    onboardingComplete: obj.onboardingComplete,
    focus: obj.focus,
    checkinPreference: obj.checkinPreference
  };
}

export function TodayClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [yearCheckins, setYearCheckins] = useState<CheckIn[]>([]);
  const [gamification, setGamification] = useState<GamificationStatus | null>(null);

  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [journal, setJournal] = useState('');

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<Focus>('ENERGY');
  const [selectedPreference, setSelectedPreference] = useState<CheckinPreference>('EVENING');
  const [captureOpen, setCaptureOpen] = useState(true);

  const [pendingMove, setPendingMove] = useState<GeneratedNextMove | null>(null);
  const [activeMove, setActiveMove] = useState<NextMoveRecord | null>(null);
  const [showSkipReasons, setShowSkipReasons] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [lastSignals, setLastSignals] = useState<NextMoveInputSignal[]>([]);

  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

  const seedTriedInBackground = useRef(false);
  const localDate = useMemo(() => todayLocalDate(), []);
  const currentYear = useMemo(() => Number(localDate.slice(0, 4)), [localDate]);
  const yearRows = useMemo(() => buildYearRows(currentYear), [currentYear]);
  const yearRange = useMemo(
    () => ({
      from: `${currentYear}-01-01`,
      to: `${currentYear}-12-31`
    }),
    [currentYear]
  );
  const [selectedDay, setSelectedDay] = useState(localDate);

  const updateValuesFromActivities = useCallback((nextActivities: Activity[]) => {
    setValues((prev) => {
      const next: Record<string, number | boolean> = { ...prev };
      for (const activity of nextActivities) {
        if (next[activity.id] === undefined) {
          next[activity.id] = activity.type === 'BOOLEAN' ? false : 0;
        }
      }
      return next;
    });
  }, []);

  const handleUnauthorized = useCallback(async () => {
    setError(uiCopy.today.sessionExpired);
    await fetch('/api/session/end', { method: 'POST' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const saveProfile = useCallback(async (payload: Partial<UserProfile>) => {
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return null;
    }

    const data = readProfilePayload(await response.json().catch(() => null));
    if (data) {
      setProfile(data);
      setSelectedFocus(data.focus);
      setSelectedPreference(data.checkinPreference);
    }

    return data;
  }, []);

  const seedSignals = useCallback(
    async (focus: Focus, checkinPreference: CheckinPreference, silent = false) => {
      setSeedStatus('loading');

      const response = await fetch('/api/setup/focus-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus, checkinPreference })
      }).catch(() => null);

      if (!response || !response.ok) {
        setSeedStatus('failed');
        if (!silent) {
          setInfo(uiCopy.today.seedLoadingInfo);
        }
        return false;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            focus: Focus;
            checkinPreference: CheckinPreference;
            activities: Activity[];
          }
        | null;

      if (!data) {
        setSeedStatus('failed');
        return false;
      }

      setSeedStatus('ready');
      setProfile((prev) => {
        if (!prev) {
          return {
            onboardingComplete: false,
            focus: data.focus,
            checkinPreference: data.checkinPreference
          };
        }

        return {
          ...prev,
          focus: data.focus,
          checkinPreference: data.checkinPreference
        };
      });
      setSelectedFocus(data.focus);
      setSelectedPreference(data.checkinPreference);
      setActivities(data.activities);
      updateValuesFromActivities(data.activities);

      if (!silent) {
        setInfo(uiCopy.today.seedReadyInfo);
      }

      return true;
    },
    [updateValuesFromActivities]
  );

  const load = useCallback(async () => {
    setError(null);

    const [profileRes, activitiesRes, checkinsRes, yearRes, gamRes] = await Promise.all([
      fetch('/api/user/profile', { cache: 'no-store' }),
      fetch('/api/setup/activities', { cache: 'no-store' }),
      fetch(`/api/checkins?from=${localDate}&to=${localDate}`, { cache: 'no-store' }),
      fetch(`/api/checkins?from=${yearRange.from}&to=${yearRange.to}`, { cache: 'no-store' }),
      fetch('/api/gamification/status', { cache: 'no-store' })
    ]);

    if ([profileRes, activitiesRes, checkinsRes, yearRes, gamRes].some((response) => response.status === 401)) {
      await handleUnauthorized();
      return;
    }

    if (!profileRes.ok || !activitiesRes.ok || !checkinsRes.ok || !yearRes.ok || !gamRes.ok) {
      setError(uiCopy.today.daySyncError);
      return;
    }

    const profileData = readProfilePayload(await profileRes.json().catch(() => null));
    const activitiesData = (await activitiesRes.json()) as { activities: Activity[] };
    const checkinsData = (await checkinsRes.json()) as CheckInsResponse;
    const yearData = (await yearRes.json()) as CheckInsResponse;
    const gamData = (await gamRes.json()) as GamificationStatus;

    if (profileData) {
      setProfile(profileData);
      setSelectedFocus(profileData.focus);
      setSelectedPreference(profileData.checkinPreference);
    }

    setActivities(activitiesData.activities);
    setCheckins(checkinsData.checkIns);
    setYearCheckins(yearData.checkIns);
    setGamification(gamData);
    updateValuesFromActivities(activitiesData.activities);

    const shouldShowWelcome =
      (profileData ? !profileData.onboardingComplete : false) || activitiesData.activities.length === 0;
    setWelcomeOpen(shouldShowWelcome && !welcomeDismissed);
  }, [handleUnauthorized, localDate, updateValuesFromActivities, welcomeDismissed, yearRange.from, yearRange.to]);

  useEffect(() => {
    setActiveMove(readActiveNextMove());
    void load();
  }, [load]);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) {
        return;
      }

      const result = await flushQueuedCheckIns();
      if (result.sent > 0) {
        setSyncInfo(uiCopy.today.syncInfoTemplate.replace('{count}', String(result.sent)));
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

  useEffect(() => {
    if (!profile || !profile.onboardingComplete || activities.length > 0 || seedTriedInBackground.current) {
      return;
    }

    seedTriedInBackground.current = true;
    void seedSignals(profile.focus, profile.checkinPreference, true);
  }, [activities.length, profile, seedSignals]);

  useEffect(() => {
    const syncSelectedDayFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const dayParam = params.get('day');

      if (typeof dayParam === 'string' && isLocalDateString(dayParam) && dayParam.startsWith(`${currentYear}-`)) {
        setSelectedDay(dayParam);
        return;
      }

      setSelectedDay(localDate);
    };

    syncSelectedDayFromLocation();
    window.addEventListener('popstate', syncSelectedDayFromLocation);
    return () => window.removeEventListener('popstate', syncSelectedDayFromLocation);
  }, [currentYear, localDate]);

  const quickSignals = useMemo(() => {
    if (!profile || activities.length === 0) {
      return [] as Activity[];
    }

    const preferredNames = QUICK_SIGNAL_BY_FOCUS[profile.focus];
    const byName = new Map(activities.map((activity) => [activity.name, activity]));

    const preferred = preferredNames
      .map((name) => byName.get(name))
      .filter((activity): activity is Activity => Boolean(activity));

    if (preferred.length >= 3) {
      return preferred.slice(0, 3);
    }

    const remaining = [...activities]
      .filter((activity) => !preferredNames.includes(activity.name))
      .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));

    return [...preferred, ...remaining].slice(0, 3);
  }, [activities, profile]);

  const captureSignals = useMemo<NextMoveInputSignal[]>(
    () =>
      quickSignals.map((activity) => ({
        name: activity.name,
        type: activity.type,
        booleanValue: activity.type === 'BOOLEAN' ? Boolean(values[activity.id]) : undefined,
        numericValue: activity.type === 'NUMERIC_0_10' ? Number(values[activity.id] ?? 0) : undefined,
        valenceHint: activity.valenceHint
      })),
    [quickSignals, values]
  );

  const dayCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of yearCheckins) {
      counts.set(entry.localDate, (counts.get(entry.localDate) ?? 0) + 1);
    }
    return counts;
  }, [yearCheckins]);

  const selectedDayEntries = useMemo(
    () =>
      yearCheckins
        .filter((entry) => entry.localDate === selectedDay)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [selectedDay, yearCheckins]
  );

  const selectedDayMoodAvg = useMemo(() => {
    if (selectedDayEntries.length === 0) {
      return 0;
    }
    const sum = selectedDayEntries.reduce((acc, entry) => acc + entry.mood, 0);
    return Number((sum / selectedDayEntries.length).toFixed(1));
  }, [selectedDayEntries]);

  const selectedDayEnergyAvg = useMemo(() => {
    if (selectedDayEntries.length === 0) {
      return 0;
    }
    const sum = selectedDayEntries.reduce((acc, entry) => acc + entry.energy, 0);
    return Number((sum / selectedDayEntries.length).toFixed(1));
  }, [selectedDayEntries]);

  const formattedSelectedDay = useMemo(() => {
    return parseLocalDate(selectedDay).toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDay]);

  const selectCalendarDay = useCallback(
    (day: string) => {
      setSelectedDay(day);

      const nextParams = new URLSearchParams(window.location.search);
      if (day === localDate) {
        nextParams.delete('day');
      } else {
        nextParams.set('day', day);
      }

      const query = nextParams.toString();
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
    },
    [localDate, pathname]
  );

  const submitCheckIn = async () => {
    setError(null);
    setInfo(null);

    const clientEventId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    const selectedIds = new Set(quickSignals.map((activity) => activity.id));
    const payload = {
      localDate,
      timestamp: new Date().toISOString(),
      mood,
      energy,
      journal,
      clientEventId,
      values: quickSignals
        .filter((activity) => selectedIds.has(activity.id))
        .map((activity) =>
          activity.type === 'BOOLEAN'
            ? {
                activityId: activity.id,
                booleanValue: Boolean(values[activity.id])
              }
            : {
                activityId: activity.id,
                numericValue: Number(values[activity.id] ?? 0)
              }
        )
    };

    if (!navigator.onLine) {
      await enqueueCheckIn({
        clientEventId,
        createdAt: Date.now(),
        payload
      });

      const offlineEntry: CheckIn = {
        id: `offline-${clientEventId}`,
        localDate,
        mood,
        energy,
        journal,
        createdAt: new Date().toISOString()
      };

      setCheckins((prev) => [...prev, offlineEntry]);
      setYearCheckins((prev) => [...prev, offlineEntry]);
      setInfo(uiCopy.today.offlineSavedInfo);
    } else {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          await handleUnauthorized();
          return;
        }

        const data = (await response.json().catch(() => ({ error: uiCopy.today.saveCheckinFallbackError }))) as {
          error?: string;
        };
        setError(data.error ?? uiCopy.today.saveCheckinFallbackError);
        return;
      }

      await load();
    }

    setJournal('');
    setShowSkipReasons(false);
    setVariantIndex(0);
    setLastSignals(captureSignals);

    const suggestion = buildNextMove({
      mood,
      energy,
      signals: captureSignals,
      variantIndex: 0
    });

    setPendingMove(suggestion);
    setCaptureOpen(false);

    if (profile && !profile.onboardingComplete) {
      await saveProfile({ onboardingComplete: true });
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
      setWelcomeOpen(false);
    }
  };

  const finalizeDecision = (decision: NextMoveRecord['decision'], skipReason?: NextMoveRecord['skipReason']) => {
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
    } else {
      writeActiveNextMove(record);
      setActiveMove(record);
    }

    setPendingMove(null);
    setShowSkipReasons(false);
    setInfo(uiCopy.today.nextStepSetInfo);
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

    setPendingMove(suggestion);
  };

  const runWelcome = async () => {
    setOverlayBusy(true);

    await saveProfile({
      focus: selectedFocus,
      checkinPreference: selectedPreference
    });

    await seedSignals(selectedFocus, selectedPreference, true);

    setOverlayBusy(false);
    setWelcomeDismissed(false);
    setWelcomeOpen(false);
    setCaptureOpen(true);
  };

  const handleSkipWelcome = () => {
    setWelcomeDismissed(true);
    setWelcomeOpen(false);
    setCaptureOpen(true);
  };

  const renderSignalInput = (activity: Activity) => {
    if (activity.type === 'BOOLEAN') {
      return (
        <CheckboxTile
          checked={Boolean(values[activity.id])}
          className="quick-signal-tile"
          key={activity.id}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              [activity.id]: event.target.checked
            }))
          }
          subtitle={uiCopy.today.quickCapture.booleanSubtitle}
          title={activity.name}
        />
      );
    }

    return (
      <Card className="quick-signal-card" key={activity.id} subtitle={uiCopy.today.quickCapture.rangeSubtitle} title={activity.name}>
        <RangeField
          className="quick-signal-range"
          label={uiCopy.today.quickCapture.rangeLabel}
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
      {welcomeOpen && (
        <Card
          className="welcome-overlay"
          tone="elevated"
          title={uiCopy.today.welcome.title}
          subtitle={uiCopy.today.welcome.subtitle}
        >
          <div className="stack-sm">
            <strong>{uiCopy.today.welcome.focusQuestion}</strong>
            <div className="choice-row">
              {(Object.keys(FOCUS_LABEL) as Focus[]).map((focus) => (
                <button
                  className={['choice-pill', selectedFocus === focus ? 'active' : ''].join(' ')}
                  key={focus}
                  onClick={() => setSelectedFocus(focus)}
                  type="button"
                >
                  {FOCUS_LABEL[focus]}
                </button>
              ))}
            </div>
          </div>

          <div className="stack-sm">
            <strong>{uiCopy.today.welcome.preferenceQuestion}</strong>
            <div className="choice-row">
              {(Object.keys(PREFERENCE_LABEL) as CheckinPreference[]).map((preference) => (
                <button
                  className={['choice-pill', selectedPreference === preference ? 'active' : ''].join(' ')}
                  key={preference}
                  onClick={() => setSelectedPreference(preference)}
                  type="button"
                >
                  {PREFERENCE_LABEL[preference]}
                </button>
              ))}
            </div>
          </div>

          <div className="inline-actions">
            <Button onClick={() => void runWelcome()} size="lg" variant="primary" disabled={overlayBusy}>
              {overlayBusy ? uiCopy.today.welcome.startCtaLoading : uiCopy.today.welcome.startCta}
            </Button>
            <Button onClick={handleSkipWelcome} size="md" variant="ghost" disabled={overlayBusy}>
              {uiCopy.today.welcome.skipCta}
            </Button>
          </div>
        </Card>
      )}

      <section className="year-focus">
        <div aria-hidden className="year-focus-art">
          <span className="orbit-ring orbit-ring--outer" />
          <span className="orbit-ring orbit-ring--inner" />
          <span className="orbit-planet" />
          <span className="orbit-star orbit-star--a" />
          <span className="orbit-star orbit-star--b" />
          <span className="orbit-star orbit-star--c" />
        </div>

        <header className="year-focus-header">
          <span className="eyebrow">{uiCopy.today.yearView.eyebrow}</span>
          <h2 className="year-focus-title">{uiCopy.today.yearView.title}</h2>
          <p className="year-focus-subtitle">{uiCopy.today.yearView.subtitle}</p>
        </header>

        <div className="year-focus-legend">
          <span>{uiCopy.today.yearView.legendNone}</span>
          <span>{uiCopy.today.yearView.legendSingle}</span>
          <span>{uiCopy.today.yearView.legendDouble}</span>
        </div>

        <div className="year-grid-shell">
          {yearRows.map((row) => (
            <div className="year-row" key={row.key}>
              <span className="year-row-label">{row.label}</span>
              <div className="year-row-days">
                {row.days.map((day) => {
                  const checkInCount = dayCountByDate.get(day.localDate) ?? 0;
                  const tone = checkInCount >= 2 ? 'double' : checkInCount === 1 ? 'single' : 'none';
                  const isActive = selectedDay === day.localDate;
                  const isToday = day.localDate === localDate;

                  return (
                    <button
                      aria-label={uiCopy.today.yearView.dayAriaLabelTemplate
                        .replace('{date}', day.localDate)
                        .replace('{count}', String(checkInCount))}
                      className={['year-dot', `year-dot--${tone}`, isActive ? 'is-active' : '', isToday ? 'is-today' : '']
                        .filter(Boolean)
                        .join(' ')}
                      key={day.localDate}
                      onClick={() => selectCalendarDay(day.localDate)}
                      type="button"
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Card tone="elevated" title={uiCopy.today.yearView.dayTitle} subtitle={formattedSelectedDay}>
        <div className="grid grid-3 compact-grid">
          <StatTile label={uiCopy.today.yearView.dayStats.entries} value={selectedDayEntries.length} />
          <StatTile
            label={uiCopy.today.yearView.dayStats.mood}
            value={selectedDayEntries.length === 0 ? '-' : selectedDayMoodAvg}
          />
          <StatTile
            label={uiCopy.today.yearView.dayStats.energy}
            value={selectedDayEntries.length === 0 ? '-' : selectedDayEnergyAvg}
          />
        </div>

        {selectedDayEntries.length === 0 ? (
          <div className="empty-state">{uiCopy.today.yearView.dayEmpty}</div>
        ) : (
          <div className="timeline">
            {selectedDayEntries.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <p>
                  <strong>{formatTime(entry.createdAt)}</strong> - {uiCopy.today.history.moodShort} {entry.mood} -{' '}
                  {uiCopy.today.history.energyShort} {entry.energy}
                </p>
                {entry.journal && <small>{entry.journal}</small>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {seedStatus === 'failed' && (
        <Banner tone="info" title={uiCopy.today.seedFailed.title}>
          {uiCopy.today.seedFailed.body}
        </Banner>
      )}

      {syncInfo && (
        <Banner tone="info" title={uiCopy.today.banners.syncTitle}>
          {syncInfo}
        </Banner>
      )}

      {info && (
        <Banner tone="success" title={uiCopy.today.banners.statusTitle}>
          {info}
        </Banner>
      )}

      {error && (
        <Banner tone="danger" title={uiCopy.today.banners.errorTitle}>
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.today.dayStatus.title} subtitle={uiCopy.today.dayStatus.subtitle}>
        <div className="grid grid-3 compact-grid">
          <StatTile
            label={uiCopy.today.dayStatus.progressLabel}
            value={`${Math.min(checkins.length, 3)}/3`}
            hint={uiCopy.today.dayStatus.progressHint}
          />
          <StatTile
            label={uiCopy.today.dayStatus.streakLabel}
            value={gamification?.currentStreak ?? 0}
            hint={uiCopy.today.dayStatus.bestStreakHintTemplate.replace('{count}', String(gamification?.bestStreak ?? 0))}
            trend={(gamification?.currentStreak ?? 0) >= 7 ? 'up' : 'neutral'}
          />
          <StatTile
            label={uiCopy.today.dayStatus.levelLabel}
            value={gamification?.level ?? 1}
            hint={uiCopy.today.dayStatus.xpHintTemplate.replace('{xp}', String(gamification?.totalXp ?? 0))}
          />
        </div>
      </Card>

      {Boolean(gamification && gamification.totalCheckIns >= 3) && (
        <Banner tone="info" title={uiCopy.today.banners.tuneTitle}>
          {uiCopy.today.banners.tuneBodyLead} <Link href="/systems">{uiCopy.today.banners.tuneBodyLink}</Link>
        </Banner>
      )}

      <Card
        tone="elevated"
        title={uiCopy.today.quickCapture.title}
        subtitle={uiCopy.today.quickCapture.subtitle}
        actions={
          <Button onClick={() => setCaptureOpen((current) => !current)} size="sm" variant="secondary">
            {captureOpen ? uiCopy.today.quickCapture.collapse : uiCopy.today.quickCapture.expand}
          </Button>
        }
      >
        {!captureOpen ? (
          <Button onClick={() => setCaptureOpen(true)} size="lg" variant="primary">
            {uiCopy.today.quickCapture.startButton}
          </Button>
        ) : (
          <>
            <div className="grid grid-2 checkin-range-grid">
              <RangeField
                className="checkin-range checkin-range--compact"
                descriptor={uiCopy.today.quickCapture.moodDescriptor}
                label={uiCopy.today.quickCapture.moodLabel}
                max={10}
                min={1}
                onChange={(event) => setMood(Number(event.target.value))}
                value={mood}
              />
              <RangeField
                className="checkin-range checkin-range--compact"
                descriptor={uiCopy.today.quickCapture.energyDescriptor}
                label={uiCopy.today.quickCapture.energyLabel}
                max={10}
                min={1}
                onChange={(event) => setEnergy(Number(event.target.value))}
                value={energy}
              />
            </div>

            <small>{uiCopy.today.quickCapture.note}</small>

            {quickSignals.length > 0 && (
              <div className="grid grid-3 quick-signals-grid">{quickSignals.map((activity) => renderSignalInput(activity))}</div>
            )}

            <label className="stack-sm journal-answer-field">
              {uiCopy.today.quickCapture.journalLabel}
              <input
                onChange={(event) => setJournal(event.target.value)}
                placeholder={uiCopy.today.quickCapture.journalPlaceholder}
                value={journal}
              />
            </label>

            <Button block onClick={submitCheckIn} size="lg" variant="primary">
              {uiCopy.today.quickCapture.saveButton}
            </Button>
          </>
        )}
      </Card>

      <Card
        tone="strong"
        title={uiCopy.today.nextStep.title}
        subtitle={pendingMove ? uiCopy.today.nextStep.pendingSubtitle : uiCopy.today.nextStep.waitingSubtitle}
      >
        {pendingMove ? (
          <div className="stack">
            <div className="panel-subtle">
              <p>
                {uiCopy.today.nextStep.rationalePrefix} <strong>{pendingMove.title}</strong> {uiCopy.today.nextStep.rationaleSuffix}
              </p>
              <small>{uiCopy.today.nextStep.hypothesisHint}</small>
              <small>
                {uiCopy.today.nextStep.minimalVariantPrefix} <strong>{pendingMove.minimalVariant}</strong>
              </small>
            </div>

            <div className="decision-actions">
              <Button onClick={() => finalizeDecision('accepted')} variant="primary">
                {uiCopy.today.nextStep.accept}
              </Button>
              <Button onClick={swapDecision} variant="secondary">
                {uiCopy.today.nextStep.swap}
              </Button>
              <Button onClick={() => setShowSkipReasons(true)} variant="ghost">
                {uiCopy.today.nextStep.skip}
              </Button>
            </div>

            {showSkipReasons && (
              <div className="decision-actions">
                {SKIP_REASON_OPTIONS.map((option) => (
                  <Button key={option.id} onClick={() => finalizeDecision('skipped', option.id)} size="sm" variant="ghost">
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : activeMove ? (
          <div className="panel-subtle">
            <p>
              <strong>{activeMove.title}</strong>
            </p>
            <small>{activeMove.minimalVariant}</small>
          </div>
        ) : (
          <div className="empty-state">{uiCopy.today.nextStep.emptyState}</div>
        )}
      </Card>

      <Card tone="elevated" title={uiCopy.today.history.title} subtitle={uiCopy.today.history.subtitle}>
        {checkins.length === 0 ? (
          <div className="empty-state">{uiCopy.today.history.emptyState}</div>
        ) : (
          <div className="timeline">
            {checkins
              .slice()
              .reverse()
              .map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <p>
                    <strong>{formatTime(entry.createdAt)}</strong> - {uiCopy.today.history.moodShort} {entry.mood} -{' '}
                    {uiCopy.today.history.energyShort} {entry.energy}
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
