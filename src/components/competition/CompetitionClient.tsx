'use client';

import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { uiCopy } from '@/lib/copy';
import type { BadgeProgress, CompetitionLeaderboardPayload, CompetitionMetric, CompetitionPeriod } from '@/types/competition';

type CompetitionMePayload = {
  metric: CompetitionMetric;
  period: CompetitionPeriod;
  rank: number | null;
  score: number;
  maxStreak: number;
  totalCheckIns: number;
  tier: 'T1' | 'T2' | 'T3';
  activeMultipliers: string[];
  progress: {
    nextTier: 'T2' | 'T3' | null;
    current: number;
    target: number;
    rule: string;
  };
  generatedAt: string;
};

const METRIC_OPTIONS: Array<{ value: CompetitionMetric; label: string }> = [
  { value: 'score', label: uiCopy.competition.metricScore },
  { value: 'maxStreak', label: uiCopy.competition.metricStreak },
  { value: 'totalCheckIns', label: uiCopy.competition.metricCheckins }
];

const PERIOD_OPTIONS: Array<{ value: CompetitionPeriod; label: string }> = [
  { value: '7d', label: uiCopy.competition.period7d },
  { value: '30d', label: uiCopy.competition.period30d },
  { value: '90d', label: uiCopy.competition.period90d },
  { value: '365d', label: uiCopy.competition.period365d },
  { value: 'this_week', label: uiCopy.competition.periodThisWeek },
  { value: 'this_month', label: uiCopy.competition.periodThisMonth },
  { value: 'this_year', label: uiCopy.competition.periodThisYear },
  { value: '5y', label: uiCopy.competition.period5y },
  { value: 'all_time', label: uiCopy.competition.periodAllTime }
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function CompetitionClient() {
  const [metric, setMetric] = useState<CompetitionMetric>('score');
  const [period, setPeriod] = useState<CompetitionPeriod>('7d');
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboardPayload | null>(null);
  const [me, setMe] = useState<CompetitionMePayload | null>(null);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);

      const [leaderboardRes, meRes, badgesRes] = await Promise.all([
        fetch(`/api/competition/leaderboard?metric=${metric}&period=${period}&limit=50`, { cache: 'no-store' }),
        fetch(`/api/competition/me?metric=${metric}&period=${period}`, { cache: 'no-store' }),
        fetch('/api/competition/badges', { cache: 'no-store' })
      ]);

      if (!leaderboardRes.ok || !meRes.ok || !badgesRes.ok) {
        setError(uiCopy.competition.loadError);
        return;
      }

      setLeaderboard((await leaderboardRes.json()) as CompetitionLeaderboardPayload);
      setMe((await meRes.json()) as CompetitionMePayload);
      setBadges(((await badgesRes.json()) as { badges: BadgeProgress[] }).badges);
    };

    void load();
  }, [metric, period]);

  const earnedCount = useMemo(() => badges.filter((badge) => badge.earned).length, [badges]);

  return (
    <div className="stack-lg">
      {error && (
        <Banner tone="danger" title={uiCopy.today.banners.errorTitle}>
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.competition.title} subtitle={uiCopy.competition.subtitle}>
        <div className="competition-toolbar">
          <label className="stack-sm">
            {uiCopy.competition.metricLabel}
            <select value={metric} onChange={(event) => setMetric(event.target.value as CompetitionMetric)}>
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="stack-sm">
            {uiCopy.competition.periodLabel}
            <select value={period} onChange={(event) => setPeriod(event.target.value as CompetitionPeriod)}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card tone="elevated" title={uiCopy.competition.meTitle} subtitle={me ? `Aktualizacja: ${formatDateTime(me.generatedAt)}` : undefined}>
        <div className="grid grid-4 compact-grid">
          <StatTile label={uiCopy.competition.rankLabel} value={me?.rank ?? '-'} />
          <StatTile label={uiCopy.competition.yourTierLabel} value={me?.tier ?? '-'} />
          <StatTile label={uiCopy.competition.yourScoreLabel} value={me?.score ?? 0} />
          <StatTile label={uiCopy.competition.yourStreakLabel} value={me?.maxStreak ?? 0} />
        </div>
        <div className="grid grid-2 compact-grid">
          <StatTile label={uiCopy.competition.yourCheckinsLabel} value={me?.totalCheckIns ?? 0} />
          <Card
            tone="default"
            title={uiCopy.competition.activeMultipliersTitle}
            subtitle={me?.progress.rule}
            className="competition-multipliers"
          >
            {me && me.activeMultipliers.length > 0 ? (
              <div className="competition-chip-row">
                {me.activeMultipliers.map((multiplier) => (
                  <span className="metric-badge" key={multiplier}>
                    {multiplier}
                  </span>
                ))}
              </div>
            ) : (
              <small>{uiCopy.competition.noMultipliers}</small>
            )}
          </Card>
        </div>
      </Card>

      <Card tone="elevated" title="Najblizsi rywale" subtitle={leaderboard?.promotionHint}>
        {!leaderboard || !leaderboard.closestRivals || leaderboard.closestRivals.length === 0 ? (
          <div className="empty-state">Brak danych o najblizszych rywalach.</div>
        ) : (
          <div className="competition-table">
            <div className="competition-table__row competition-table__row--head">
              <span>{uiCopy.competition.tableRank}</span>
              <span>{uiCopy.competition.tableUser}</span>
              <span>{uiCopy.competition.tableScore}</span>
              <span>{uiCopy.competition.tableStreak}</span>
              <span>{uiCopy.competition.tableCheckins}</span>
            </div>
            {leaderboard.closestRivals.map((row) => (
              <div className="competition-table__row" key={`closest-${row.userId}`}>
                <span>#{row.rank}</span>
                <span className="competition-user-cell">
                  <strong>{row.displayName}</strong>
                </span>
                <span>{row.score}</span>
                <span>{row.maxStreak}</span>
                <span>{row.totalCheckIns}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card tone="elevated" title={uiCopy.competition.leaderboardTitle}>
        {!leaderboard || leaderboard.rows.length === 0 ? (
          <div className="empty-state">{uiCopy.competition.noRows}</div>
        ) : (
          <div className="competition-table">
            <div className="competition-table__row competition-table__row--head">
              <span>{uiCopy.competition.tableRank}</span>
              <span>{uiCopy.competition.tableUser}</span>
              <span>{uiCopy.competition.tableScore}</span>
              <span>{uiCopy.competition.tableStreak}</span>
              <span>{uiCopy.competition.tableCheckins}</span>
            </div>
            {leaderboard.rows.map((row) => (
              <div className="competition-table__row" key={row.userId}>
                <span>#{row.rank}</span>
                <span className="competition-user-cell">
                  <strong>{row.displayName}</strong>
                </span>
                <span>{row.score}</span>
                <span>{row.maxStreak}</span>
                <span>{row.totalCheckIns}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card tone="elevated" title={uiCopy.competition.badgesTitle} subtitle={`Zdobyte: ${earnedCount}/${badges.length}`}>
        <div className="competition-badge-wall">
          {badges.map((badge) => (
            <div className={['competition-badge-tile', badge.earned ? 'is-earned' : ''].join(' ')} key={badge.badge}>
              <strong>{badge.title}</strong>
              <small>{badge.description}</small>
              <small>
                {badge.progress}/{badge.target}
              </small>
              {badge.awardedAt && <small>{formatDateTime(badge.awardedAt)}</small>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
