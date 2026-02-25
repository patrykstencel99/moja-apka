'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
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
      <Card tone="elevated" title={uiCopy.experiments.title} subtitle={uiCopy.experiments.subtitle}>
        {items.length === 0 ? (
          <div className="empty-state">{uiCopy.experiments.empty}</div>
        ) : (
          <div className="timeline">
            {items.map((item) => (
              <div className="timeline-item" key={item.id}>
                <p>
                  <strong>{item.title}</strong> • {item.localDate}
                </p>
                <small>{item.why}</small>
                <small>
                  {uiCopy.experiments.variantPrefix} {item.minimalVariant}
                </small>
                <small>
                  {uiCopy.experiments.decisionPrefix} {item.decision}
                  {item.skipReason ? ` (${item.skipReason})` : ''}
                </small>

                <div className="decision-actions">
                  <Button onClick={() => setResult(item.id, 'lepiej')} size="sm" variant="secondary">
                    {uiCopy.experiments.resultBetter}
                  </Button>
                  <Button onClick={() => setResult(item.id, 'bez-zmian')} size="sm" variant="ghost">
                    {uiCopy.experiments.resultNeutral}
                  </Button>
                  <Button onClick={() => setResult(item.id, 'gorzej')} size="sm" variant="ghost">
                    {uiCopy.experiments.resultWorse}
                  </Button>
                </div>

                {item.result && (
                  <small>
                    {uiCopy.experiments.lastResultPrefix} {item.result}
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
