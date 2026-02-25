'use client';

import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import type { StarterSignal, StarterSystem } from '@/types/domain';

type Props = {
  system: StarterSystem;
};

type SignalConfig = {
  name: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  cadence: 'RANO' | 'DZIEN' | 'WIECZOR';
};

function normalizeSignal(signal: StarterSignal): SignalConfig {
  return {
    name: signal.name,
    type: signal.type,
    cadence: signal.cadence
  };
}

export function SystemTuneClient({ system }: Props) {
  const [configs, setConfigs] = useState<SignalConfig[]>([
    ...system.coreSignals.map(normalizeSignal),
    ...system.advancedSignals.map(normalizeSignal)
  ]);
  const [saved, setSaved] = useState(false);

  const updateSignal = (name: string, patch: Partial<SignalConfig>) => {
    setSaved(false);
    setConfigs((prev) => prev.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  };

  return (
    <div className="stack-lg">
      <Card
        tone="elevated"
        title={`${uiCopy.systemTune.titlePrefix} ${system.name}`}
        subtitle={uiCopy.systemTune.subtitle}
      >
        <div className="stack">
          {configs.map((signal) => (
            <Card key={signal.name} subtitle={uiCopy.systemTune.signalCardSubtitle} title={signal.name}>
              <div className="grid grid-2">
                <label className="stack-sm">
                  {uiCopy.systemTune.typeLabel}
                  <select
                    onChange={(event) =>
                      updateSignal(signal.name, {
                        type: event.target.value as SignalConfig['type']
                      })
                    }
                    value={signal.type}
                  >
                    <option value="BOOLEAN">Tak/Nie</option>
                    <option value="NUMERIC_0_10">Skala 0-10</option>
                  </select>
                </label>

                <label className="stack-sm">
                  {uiCopy.systemTune.cadenceLabel}
                  <select
                    onChange={(event) =>
                      updateSignal(signal.name, {
                        cadence: event.target.value as SignalConfig['cadence']
                      })
                    }
                    value={signal.cadence}
                  >
                    <option value="RANO">{uiCopy.systemTune.cadenceMorning}</option>
                    <option value="DZIEN">{uiCopy.systemTune.cadenceDay}</option>
                    <option value="WIECZOR">{uiCopy.systemTune.cadenceEvening}</option>
                  </select>
                </label>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {saved && (
        <Banner tone="success" title={uiCopy.systemTune.savedTitle}>
          {uiCopy.systemTune.savedBody}
        </Banner>
      )}

      <Button onClick={() => setSaved(true)} size="lg" variant="primary">
        {uiCopy.systemTune.doneButton}
      </Button>
    </div>
  );
}
