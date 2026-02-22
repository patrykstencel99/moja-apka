'use client';

import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      <Card tone="elevated" title={`Doprecyzowanie: ${system.name}`} subtitle="Typ sygnalu i kiedy ma sens.">
        <div className="stack">
          {configs.map((signal) => (
            <Card key={signal.name} subtitle="Dopasuj pod swoj rytm" title={signal.name}>
              <div className="grid grid-2">
                <label className="stack-sm">
                  Typ
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
                  Kiedy ma sens
                  <select
                    onChange={(event) =>
                      updateSignal(signal.name, {
                        cadence: event.target.value as SignalConfig['cadence']
                      })
                    }
                    value={signal.cadence}
                  >
                    <option value="RANO">Rano</option>
                    <option value="DZIEN">W ciagu dnia</option>
                    <option value="WIECZOR">Wieczorem</option>
                  </select>
                </label>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {saved && (
        <Banner tone="success" title="Zapisane lokalnie">
          Konfiguracja dopracowana. W tej wersji MVP ustawienia tuningu sa warstwa UI.
        </Banner>
      )}

      <Button onClick={() => setSaved(true)} size="lg" variant="primary">
        Gotowe
      </Button>
    </div>
  );
}
