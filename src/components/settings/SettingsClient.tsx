'use client';

import { useEffect, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';
import { STORAGE_KEYS, readExperiments, readString } from '@/lib/state/local-storage';
import { useTutorial } from '@/components/tutorial/TutorialProvider';
import type { ThemeDto } from '@/types/fun';

type ProfilePayload = {
  displayName: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  themeKey?: string;
  notificationsEnabled?: boolean;
  slot1HourLocal?: number;
  slot2HourLocal?: number;
  socialPressureMode?: 'STRONG' | 'SOFT';
};

type ThemesPayload = {
  themes: ThemeDto[];
  activeTheme: string;
  level: number;
};

export function SettingsClient() {
  const { restartFromSettings } = useTutorial();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [activeTheme, setActiveTheme] = useState('obsidian-command');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [slot1HourLocal, setSlot1HourLocal] = useState(8);
  const [slot2HourLocal, setSlot2HourLocal] = useState(20);
  const [socialPressureMode, setSocialPressureMode] = useState<'STRONG' | 'SOFT'>('STRONG');
  const [pushSupported, setPushSupported] = useState(false);
  const [isRestartingTutorial, setIsRestartingTutorial] = useState(false);

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
      setNotificationsEnabled(Boolean(data.notificationsEnabled));
      setSlot1HourLocal(typeof data.slot1HourLocal === 'number' ? data.slot1HourLocal : 8);
      setSlot2HourLocal(typeof data.slot2HourLocal === 'number' ? data.slot2HourLocal : 20);
      setSocialPressureMode(data.socialPressureMode === 'SOFT' ? 'SOFT' : 'STRONG');

      if (themesRes.ok) {
        const themesPayload = (await themesRes.json()) as ThemesPayload;
        setThemes(themesPayload.themes ?? []);
        setActiveTheme(themesPayload.activeTheme ?? 'obsidian-command');
        setCurrentLevel(themesPayload.level ?? 1);
      }
    };

    void loadProfile();

    const canUsePush =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setPushSupported(canUsePush);
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
        avatarSeed: avatarSeed.trim() ? avatarSeed.trim() : null,
        slot1HourLocal,
        slot2HourLocal,
        socialPressureMode
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

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      output[i] = rawData.charCodeAt(i);
    }

    return output;
  };

  const enablePush = async () => {
    if (!pushSupported) {
      setError('Ta przegladarka nie wspiera web push.');
      setMessage(null);
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError('Brak NEXT_PUBLIC_VAPID_PUBLIC_KEY. Skonfiguruj klucz VAPID.');
      setMessage(null);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setError('Brak zgody na powiadomienia.');
      setMessage(null);
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      }));

    const subscriptionJson = subscription.toJSON() as {
      endpoint: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;
    if (!subscriptionJson.endpoint || !p256dh || !auth) {
      setError('Subskrypcja push jest niekompletna.');
      setMessage(null);
      return;
    }

    const response = await fetch('/api/push/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh,
          auth
        }
      })
    });

    if (!response.ok) {
      setError('Nie udalo sie zapisac subskrypcji push.');
      setMessage(null);
      return;
    }

    setNotificationsEnabled(true);
    setMessage('Powiadomienia push wlaczone.');
    setError(null);
  };

  const disablePush = async () => {
    if (!pushSupported) {
      setNotificationsEnabled(false);
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await fetch('/api/push/subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint })
      });
      await subscription.unsubscribe().catch(() => null);
    }

    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationsEnabled: false })
    });

    setNotificationsEnabled(false);
    setMessage('Powiadomienia push wylaczone.');
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

  const restartTutorial = async () => {
    if (isRestartingTutorial) {
      return;
    }

    setIsRestartingTutorial(true);
    setError(null);

    try {
      const ok = await restartFromSettings();
      if (!ok) {
        setError(uiCopy.settings.tutorialRestartError);
        setMessage(null);
        return;
      }

      setMessage(uiCopy.settings.tutorialRestarted);
      setError(null);
    } finally {
      setIsRestartingTutorial(false);
    }
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

      <Card tone="elevated" title="Przypomnienia i presja" subtitle="Rytm 2 check-inow i tryb social pressure">
        <div className="stack-sm">
          <label className="stack-sm">
            Slot 1 (start dnia, godzina lokalna)
            <input
              max={23}
              min={0}
              onChange={(event) => setSlot1HourLocal(Math.max(0, Math.min(23, Number(event.target.value) || 0)))}
              type="number"
              value={slot1HourLocal}
            />
          </label>

          <label className="stack-sm">
            Slot 2 (zamkniecie dnia, godzina lokalna)
            <input
              max={23}
              min={0}
              onChange={(event) => setSlot2HourLocal(Math.max(0, Math.min(23, Number(event.target.value) || 0)))}
              type="number"
              value={slot2HourLocal}
            />
          </label>

          <label className="stack-sm">
            Tryb presji social
            <select
              onChange={(event) => setSocialPressureMode(event.target.value as 'STRONG' | 'SOFT')}
              value={socialPressureMode}
            >
              <option value="STRONG">STRONG</option>
              <option value="SOFT">SOFT</option>
            </select>
          </label>

          <div className="inline-actions">
            <Button onClick={() => void saveProfile()} variant="secondary">
              Zapisz ustawienia rytmu
            </Button>
            {notificationsEnabled ? (
              <Button onClick={() => void disablePush()} variant="ghost">
                Wylacz push
              </Button>
            ) : (
              <Button onClick={() => void enablePush()} variant="primary" disabled={!pushSupported}>
                Wlacz push
              </Button>
            )}
          </div>

          <small>
            Status push: <strong>{notificationsEnabled ? 'Wlaczone' : 'Wylaczone'}</strong>
          </small>
          {!pushSupported && <small>Ta przegladarka nie wspiera web push.</small>}
        </div>
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

      <Card tone="elevated" title={uiCopy.settings.tutorialTitle} subtitle={uiCopy.settings.tutorialSubtitle}>
        <Button
          data-tutorial-id="settings-tutorial-restart"
          disabled={isRestartingTutorial}
          onClick={() => void restartTutorial()}
          variant="secondary"
        >
          {isRestartingTutorial ? uiCopy.settings.tutorialRestartPending : uiCopy.settings.tutorialRestartButton}
        </Button>
      </Card>

      <Card tone="default" title={uiCopy.settings.sessionTitle} subtitle={uiCopy.settings.sessionSubtitle}>
        <Button onClick={() => void logout()} variant="danger">
          {uiCopy.settings.logoutButton}
        </Button>
      </Card>
    </div>
  );
}
