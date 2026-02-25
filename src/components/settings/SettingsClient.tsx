'use client';

import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readExperiments, readString } from '@/lib/state/local-storage';

export function SettingsClient() {
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = async () => {
    const response = await fetch('/api/checkins?from=2000-01-01&to=2100-01-01');

    if (!response.ok) {
      setMessage(uiCopy.settings.exportError);
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
    setMessage(uiCopy.settings.exportSuccess);
  };

  const logout = async () => {
    await fetch('/api/session/end', { method: 'POST' });
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="stack-lg">
      {message && (
        <Banner tone="success" title={uiCopy.settings.statusTitle}>
          {message}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.settings.accessTitle} subtitle={uiCopy.settings.accessSubtitle}>
        <p>{uiCopy.settings.accessBody}</p>
      </Card>

      <Card tone="elevated" title={uiCopy.settings.backupTitle} subtitle={uiCopy.settings.backupSubtitle}>
        <Button onClick={() => void exportBackup()} variant="secondary">
          {uiCopy.settings.backupButton}
        </Button>
      </Card>

      <Card tone="elevated" title={uiCopy.settings.privacyTitle} subtitle={uiCopy.settings.privacySubtitle}>
        <p>{uiCopy.settings.privacyBody}</p>
      </Card>

      <Card tone="default" title={uiCopy.settings.sessionTitle} subtitle={uiCopy.settings.sessionSubtitle}>
        <Button onClick={() => void logout()} variant="danger">
          {uiCopy.settings.logoutButton}
        </Button>
      </Card>
    </div>
  );
}
