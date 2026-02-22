'use client';

import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { STORAGE_KEYS, readExperiments, readString } from '@/lib/state/local-storage';

export function SettingsClient() {
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = async () => {
    const response = await fetch('/api/checkins?from=2000-01-01&to=2100-01-01');

    if (!response.ok) {
      setMessage('Nie udalo sie pobrac danych do exportu.');
      return;
    }

    const checkins = await response.json();
    const experiments = readExperiments();
    const payload = {
      exportedAt: new Date().toISOString(),
      rhythm: readString(STORAGE_KEYS.checkInRhythm),
      quickDefault: readString(STORAGE_KEYS.quickDefault),
      checkins,
      experiments
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `patternfinder-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    setMessage('Backup wyeksportowany.');
  };

  const logout = async () => {
    await fetch('/api/session/end', { method: 'POST' });
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="stack-lg">
      {message && (
        <Banner tone="success" title="Status">
          {message}
        </Banner>
      )}

      <Card tone="elevated" title="PIN" subtitle="Aktualny status dostepu.">
        <p>Logowanie przez PIN jest aktywne. Wartosc PIN ustawiasz przez `APP_PIN` w env.</p>
      </Card>

      <Card tone="elevated" title="Backup i export" subtitle="Pobierz snapshot danych lokalnych i check-inow.">
        <Button onClick={() => void exportBackup()} variant="secondary">
          Export JSON
        </Button>
      </Card>

      <Card tone="elevated" title="Prywatnosc" subtitle="Standard startup privacy.">
        <p>Produkt nie jest narzedziem medycznym. Insighty sa hipotezami, nie przyczynowoscia.</p>
      </Card>

      <Card tone="default" title="Sesja" subtitle="Wylogowanie resetuje local flow na tym urzadzeniu.">
        <Button onClick={() => void logout()} variant="danger">
          Wyloguj i wyczysc sesje
        </Button>
      </Card>
    </div>
  );
}
