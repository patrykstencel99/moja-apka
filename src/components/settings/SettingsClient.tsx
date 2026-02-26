'use client';

import { useEffect, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readExperiments, readString } from '@/lib/state/local-storage';
import type { ThemeDto } from '@/types/fun';

type ProfilePayload = {
  displayName: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  themeKey?: string;
};

type ThemesPayload = {
  themes: ThemeDto[];
  activeTheme: string;
  level: number;
};

export function SettingsClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [activeTheme, setActiveTheme] = useState('obsidian-command');
  const [currentLevel, setCurrentLevel] = useState(1);

  useEffect(() => {
    const loadProfile = async () => {
      const [profileRes, themesRes] = await Promise.all([
        fetch('/api/user/profile', { cache: 'no-store' }),
        fetch('/api/themes', { cache: 'no-store' })
      ]);

      if (!profileRes.ok) {
        return;
      }

      const data = (await profileRes.json()) as ProfilePayload;
      setDisplayName(data.displayName ?? '');
      setAvatarUrl(data.avatarUrl ?? '');
      setAvatarSeed(data.avatarSeed ?? '');

      if (themesRes.ok) {
        const themesPayload = (await themesRes.json()) as ThemesPayload;
        setThemes(themesPayload.themes ?? []);
        setActiveTheme(themesPayload.activeTheme ?? 'obsidian-command');
        setCurrentLevel(themesPayload.level ?? 1);
      }
    };

    void loadProfile();
  }, []);

  const exportBackup = async () => {
    const response = await fetch('/api/checkins?from=2000-01-01&to=2100-01-01');

    if (!response.ok) {
      setError(uiCopy.settings.exportError);
      setMessage(null);
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
    setError(null);
  };

  const saveProfile = async () => {
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName,
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        avatarSeed: avatarSeed.trim() ? avatarSeed.trim() : null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? uiCopy.settings.exportError);
      setMessage(null);
      return;
    }

    setMessage(uiCopy.settings.profileSaved);
    setError(null);
  };

  const applyTheme = async (themeKey: string) => {
    const response = await fetch('/api/themes', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ themeKey })
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<ThemesPayload> & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Nie udalo sie zmienic motywu.');
      setMessage(null);
      return;
    }

    setThemes(payload.themes ?? []);
    setActiveTheme(payload.activeTheme ?? themeKey);
    if (typeof payload.level === 'number') {
      setCurrentLevel(payload.level);
    }
    document.documentElement.setAttribute('data-theme', payload.activeTheme ?? themeKey);
    setMessage('Motyw zmieniony.');
    setError(null);
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

      {error && (
        <Banner tone="danger" title={uiCopy.today.banners.errorTitle}>
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.settings.profileTitle} subtitle={uiCopy.settings.profileSubtitle}>
        <label className="stack-sm">
          {uiCopy.settings.displayNameLabel}
          <input maxLength={24} minLength={3} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>

        <label className="stack-sm">
          {uiCopy.settings.avatarUrlLabel}
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
        </label>

        <label className="stack-sm">
          {uiCopy.settings.avatarSeedLabel}
          <input maxLength={120} value={avatarSeed} onChange={(event) => setAvatarSeed(event.target.value)} />
        </label>

        <Button onClick={() => void saveProfile()} variant="secondary">
          {uiCopy.settings.profileSaveButton}
        </Button>
      </Card>

      <Card tone="elevated" title="Motywy UI" subtitle={`Poziom konta: ${currentLevel}`}>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              className={['theme-tile', theme.active ? 'active' : '', !theme.unlocked ? 'locked' : ''].filter(Boolean).join(' ')}
              disabled={!theme.unlocked}
              key={theme.key}
              onClick={() => void applyTheme(theme.key)}
              type="button"
            >
              <strong>{theme.label}</strong>
              <small>{theme.unlocked ? (theme.active ? 'Aktywny' : 'Dostepny') : `Od poziomu ${theme.minLevel}`}</small>
              <small>{theme.key}</small>
            </button>
          ))}
        </div>
        <small>Aktywny motyw: {activeTheme}</small>
      </Card>

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
