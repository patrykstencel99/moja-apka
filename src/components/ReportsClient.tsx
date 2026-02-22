'use client';

import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';

type Insight = {
  factor: string;
  direction: 'positive' | 'negative';
  confidence: number;
  lag: 0 | 1;
  explanation: string;
};

type ReportResponse = {
  insufficientData: boolean;
  message: string;
  uniqueDays: number;
  positive: Insight[];
  negative: Insight[];
  macroPatterns: Array<{
    title: string;
    description: string;
    confidence: number;
  }>;
};

type GamificationResponse = {
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  totalXp: number;
  level: number;
  avgEntriesPerDay: number;
  badges: Array<{ badge: string; awardedAt: string }>;
  leaderboard: {
    bestStreak: number;
    totalCheckIns: number;
    avgEntriesPerDay: number;
  };
};

function isoWeekString(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function topSignal(report: ReportResponse | null, direction: 'positive' | 'negative') {
  if (!report || report.insufficientData) {
    return null;
  }

  const list = direction === 'positive' ? report.positive : report.negative;
  return list[0] ?? null;
}

export function ReportsClient() {
  const [weekly, setWeekly] = useState<ReportResponse | null>(null);
  const [monthly, setMonthly] = useState<ReportResponse | null>(null);
  const [gamification, setGamification] = useState<GamificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const week = isoWeekString(now);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const load = async () => {
      setError(null);
      const [weeklyRes, monthlyRes, gamRes] = await Promise.all([
        fetch(`/api/reports/weekly?week=${week}`),
        fetch(`/api/reports/monthly?month=${month}`),
        fetch('/api/gamification/status')
      ]);

      if (!weeklyRes.ok || !monthlyRes.ok || !gamRes.ok) {
        setError('Nie udalo sie pobrac raportow.');
        return;
      }

      setWeekly((await weeklyRes.json()) as ReportResponse);
      setMonthly((await monthlyRes.json()) as ReportResponse);
      setGamification((await gamRes.json()) as GamificationResponse);
    };

    void load();
  }, []);

  const weeklyTopPositive = useMemo(() => topSignal(weekly, 'positive'), [weekly]);
  const weeklyTopNegative = useMemo(() => topSignal(weekly, 'negative'), [weekly]);

  const recommendedAction = useMemo(() => {
    if (!weeklyTopNegative && !weeklyTopPositive) {
      return 'Zbieraj dane przez kolejne dni, aby aktywować precyzyjniejsze sygnaly.';
    }

    if (weeklyTopNegative && weeklyTopPositive) {
      return `Ogranicz "${weeklyTopNegative.factor}" i zduplikuj warunki "${weeklyTopPositive.factor}" jutro rano.`;
    }

    if (weeklyTopNegative) {
      return `Wprowadz barierę ochronną przed "${weeklyTopNegative.factor}" na najbliższe 48h.`;
    }

    return `Utrwal sygnal "${weeklyTopPositive?.factor}" jako stały element porannego protokołu.`;
  }, [weeklyTopNegative, weeklyTopPositive]);

  const macroTimeline = useMemo(() => {
    const weeklyItems = weekly?.macroPatterns ?? [];
    const monthlyItems = monthly?.macroPatterns ?? [];

    return [
      ...weeklyItems.map((pattern) => ({ ...pattern, window: 'Tydzien' })),
      ...monthlyItems.map((pattern) => ({ ...pattern, window: 'Miesiac' }))
    ];
  }, [weekly, monthly]);

  return (
    <div className="stack-lg">
      {error && (
        <Banner tone="danger" title="Blad pobierania raportu">
          {error}
        </Banner>
      )}

      <Card
        tone="strong"
        title="Executive summary"
        subtitle="Wnioski hipotezowe z ostatniego okna danych. Traktuj je jako sygnal decyzyjny, nie dowod przyczynowy."
      >
        <div className="grid grid-4">
          <StatTile label="Streak" trend={(gamification?.currentStreak ?? 0) >= 7 ? 'up' : 'neutral'} value={gamification?.currentStreak ?? 0} />
          <StatTile label="Poziom" trend="up" value={gamification?.level ?? 1} />
          <StatTile label="Top gain" value={weeklyTopPositive?.factor ?? 'Brak'} hint={weeklyTopPositive ? `${weeklyTopPositive.confidence}%` : 'Za malo danych'} />
          <StatTile label="Top risk" value={weeklyTopNegative?.factor ?? 'Brak'} hint={weeklyTopNegative ? `${weeklyTopNegative.confidence}%` : 'Za malo danych'} trend={weeklyTopNegative ? 'down' : 'neutral'} />
        </div>

        <Banner tone="info" title="Nastepny ruch">
          {recommendedAction}
        </Banner>
      </Card>

      <Card
        tone="elevated"
        title="Sygnaly decyzji"
        subtitle="Top 3 czynniki pozytywne i negatywne z bieżącego tygodnia."
      >
        <div className="grid grid-2">
          <SignalList insights={weekly?.positive ?? []} title="Top 3 pozytywne" />
          <SignalList insights={weekly?.negative ?? []} title="Top 3 negatywne" />
        </div>
      </Card>

      <Card
        tone="elevated"
        title="Pattern chain"
        subtitle="Sekwencje mikro i makro, ktore najczęściej uruchamiają ciag zdarzeń."
      >
        {macroTimeline.length === 0 ? (
          <div className="empty-state">Brak wzorcow lancuchowych. Zwieksz liczbe wpisow i utrzymaj regularnosc.</div>
        ) : (
          <div className="timeline">
            {macroTimeline.map((pattern, index) => (
              <div className="timeline-item" key={`${pattern.title}-${index}`}>
                <p>
                  <strong>{pattern.window}</strong> • {pattern.title}
                </p>
                <small>
                  Confidence {pattern.confidence}% • {pattern.description}
                </small>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-2">
        <ReportCard report={weekly} title="Raport tygodniowy" />
        <ReportCard report={monthly} title="Raport miesieczny" />
      </div>
    </div>
  );
}

function SignalList({ title, insights }: { title: string; insights: Insight[] }) {
  return (
    <Card subtitle="Poziom confidence i opoznienie sygnalu" title={title}>
      {insights.length === 0 ? (
        <div className="empty-state">Brak sygnalow o wymaganej sile statystycznej.</div>
      ) : (
        <ul>
          {insights.map((insight, index) => (
            <li key={`${insight.factor}-${index}`}>
              <p>
                <strong>{insight.factor}</strong> • confidence {insight.confidence}% • lag {insight.lag}d
              </p>
              <small>{insight.explanation}</small>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ReportCard({ title, report }: { title: string; report: ReportResponse | null }) {
  return (
    <Card subtitle="Okno analityczne" title={title}>
      {!report ? (
        <div className="empty-state">Ladowanie raportu...</div>
      ) : (
        <>
          <p>
            Dni z danymi: <strong>{report.uniqueDays}</strong>
          </p>
          <small>{report.message}</small>
        </>
      )}
    </Card>
  );
}
