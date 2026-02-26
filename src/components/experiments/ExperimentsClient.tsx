'use client';

import { useEffect, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import type { DuelDto, DuelResultDto } from '@/types/fun';

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function choiceLabel(duel: DuelDto) {
  if (duel.selectedChoice === 'A') {
    return duel.optionA.title;
  }
  if (duel.selectedChoice === 'B') {
    return duel.optionB.title;
  }
  return 'Brak wyboru';
}

function resultLabel(result: DuelResultDto) {
  if (result === 'BETTER') {
    return 'Lepiej';
  }
  if (result === 'SAME') {
    return 'Bez zmian';
  }
  return 'Gorzej';
}

export function ExperimentsClient() {
  const [items, setItems] = useState<DuelDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/fun/duels?limit=200', {
        cache: 'no-store'
      });
      if (!response.ok) {
        setError('Nie udalo sie pobrac historii duelow.');
        return;
      }

      const data = (await response.json().catch(() => null)) as { duels?: DuelDto[] } | null;
      setItems(data?.duels ?? []);
    };

    void load();
  }, []);

  const setResult = async (id: string, result: DuelResultDto) => {
    setBusyId(id);
    setError(null);
    setStatus(null);

    const response = await fetch('/api/fun/duel/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duelId: id,
        result
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { duel?: DuelDto; error?: string };

    if (!response.ok || !payload.duel) {
      setError(payload.error ?? 'Nie udalo sie zapisac wyniku duelu.');
      setBusyId(null);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === id ? payload.duel ?? item : item)));
    setStatus('Wynik duelu zapisany.');
    setBusyId(null);
  };

  return (
    <div className="stack-lg">
      {status && (
        <Banner tone="success" title={uiCopy.settings.statusTitle}>
          {status}
        </Banner>
      )}

      {error && (
        <Banner tone="danger" title={uiCopy.today.banners.errorTitle}>
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.experiments.title} subtitle={uiCopy.experiments.subtitle}>
        {items.length === 0 ? (
          <div className="empty-state">{uiCopy.experiments.empty}</div>
        ) : (
          <div className="timeline">
            {items.map((item) => (
              <div className="timeline-item" key={item.id}>
                <p>
                  <strong>Duel dnia</strong> • {item.localDate}
                </p>
                <small>
                  Wybrany wariant: <strong>{choiceLabel(item)}</strong>
                </small>
                <small>
                  Wersja minimalna:{' '}
                  {item.selectedChoice === 'A'
                    ? item.optionA.minimalVariant
                    : item.selectedChoice === 'B'
                      ? item.optionB.minimalVariant
                      : '-'}
                </small>
                <small>
                  Status: {item.status}
                </small>

                <div className="decision-actions">
                  <Button
                    disabled={item.status !== 'SELECTED' || busyId === item.id || item.localDate >= todayLocalDate()}
                    onClick={() => void setResult(item.id, 'BETTER')}
                    size="sm"
                    variant="secondary"
                  >
                    Lepiej
                  </Button>
                  <Button
                    disabled={item.status !== 'SELECTED' || busyId === item.id || item.localDate >= todayLocalDate()}
                    onClick={() => void setResult(item.id, 'SAME')}
                    size="sm"
                    variant="ghost"
                  >
                    Bez zmian
                  </Button>
                  <Button
                    disabled={item.status !== 'SELECTED' || busyId === item.id || item.localDate >= todayLocalDate()}
                    onClick={() => void setResult(item.id, 'WORSE')}
                    size="sm"
                    variant="ghost"
                  >
                    Gorzej
                  </Button>
                </div>

                {item.result && (
                  <small>
                    Ostatni wynik: {resultLabel(item.result)}
                  </small>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
