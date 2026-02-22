'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  readExperiments,
  type NextMoveRecord,
  writeExperiments
} from '@/lib/state/local-storage';

export function ExperimentsClient() {
  const [items, setItems] = useState<NextMoveRecord[]>([]);

  useEffect(() => {
    setItems(readExperiments());
  }, []);

  const setResult = (id: string, result: NonNullable<NextMoveRecord['result']>) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, result } : item));
      writeExperiments(next);
      return next;
    });
  };

  return (
    <div className="stack-lg">
      <Card tone="elevated" title="Eksperymenty" subtitle="Historia Next Move i wyniki testow.">
        {items.length === 0 ? (
          <div className="empty-state">Brak eksperymentow. Po check-inie i decyzji zapisze sie pierwszy wpis.</div>
        ) : (
          <div className="timeline">
            {items.map((item) => (
              <div className="timeline-item" key={item.id}>
                <p>
                  <strong>{item.title}</strong> • {item.localDate}
                </p>
                <small>{item.why}</small>
                <small>Wariant 10%: {item.minimalVariant}</small>
                <small>
                  Decyzja: {item.decision}
                  {item.skipReason ? ` (${item.skipReason})` : ''}
                </small>

                <div className="decision-actions">
                  <Button onClick={() => setResult(item.id, 'lepiej')} size="sm" variant="secondary">
                    Wynik: lepiej
                  </Button>
                  <Button onClick={() => setResult(item.id, 'bez-zmian')} size="sm" variant="ghost">
                    Wynik: bez zmian
                  </Button>
                  <Button onClick={() => setResult(item.id, 'gorzej')} size="sm" variant="ghost">
                    Wynik: gorzej
                  </Button>
                </div>

                {item.result && <small>Ostatni wynik: {item.result}</small>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
