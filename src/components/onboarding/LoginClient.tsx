'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';

export function LoginClient() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Nie udalo sie uruchomic sesji.' }))) as {
        error?: string;
      };
      setError(payload.error ?? 'Nie udalo sie uruchomic sesji. Sprobuj ponownie.');
      setIsLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <section className="panel auth-panel">
      <header className="hero-header">
        <span className="eyebrow">PatternFinder</span>
        <h1>Od reaktywnosci do kontroli przez codzienny system decyzji</h1>
        <p className="hero-support">
          Wejdz do cockpitu samoregulacji. Ten MVP dziala bez konta i prowadzi Cie krok po kroku.
        </p>
      </header>

      {error && (
        <Banner tone="danger" title="Blad uruchomienia">
          {error}
        </Banner>
      )}

      <div className="stack">
        <label className="stack-sm" htmlFor="pin">
          PIN
          <input
            autoComplete="current-password"
            id="pin"
            inputMode="numeric"
            maxLength={24}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Wpisz PIN"
            type="password"
            value={pin}
          />
        </label>

        <Button onClick={handleStart} size="lg" variant="primary" disabled={isLoading || pin.trim().length < 4}>
          {isLoading ? 'Logowanie...' : 'Wejdz do systemu'}
        </Button>
        <small>Tryb single-user. PIN ustawia sie przez `APP_PIN`.</small>
      </div>
    </section>
  );
}
