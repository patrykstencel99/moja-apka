'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    const response = await fetch('/api/auth/status');
    if (!response.ok) {
      setHasUsers(true);
      return;
    }

    const data = (await response.json()) as { hasUsers: boolean };
    setHasUsers(data.hasUsers);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);

    const endpoint = hasUsers ? '/api/session/start' : '/api/auth/register';
    const payload = hasUsers
      ? { email, password }
      : {
          email,
          password,
          confirmPassword
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
          Wejdz do cockpitu samoregulacji. Pierwszy uzytkownik zaklada konto email i przejmuje aplikacje.
        </p>
      </header>

      {error && (
        <Banner tone="danger" title="Blad uruchomienia">
          {error}
        </Banner>
      )}

      <div className="stack">
        <label className="stack-sm" htmlFor="email">
          Email
          <input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="twoj@email.com"
            type="email"
            value={email}
          />
        </label>

        <label className="stack-sm" htmlFor="password">
          Haslo
          <input
            autoComplete={hasUsers ? 'current-password' : 'new-password'}
            id="password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 znakow"
            type="password"
            value={password}
          />
        </label>

        {hasUsers === false && (
          <label className="stack-sm" htmlFor="confirmPassword">
            Potwierdz haslo
            <input
              autoComplete="new-password"
              id="confirmPassword"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Powtorz haslo"
              type="password"
              value={confirmPassword}
            />
          </label>
        )}

        <Button
          onClick={handleStart}
          size="lg"
          variant="primary"
          disabled={
            isLoading ||
            hasUsers === null ||
            !email.trim() ||
            password.trim().length < 8 ||
            (hasUsers === false && confirmPassword.trim().length < 8)
          }
        >
          {isLoading ? 'Logowanie...' : hasUsers ? 'Zaloguj sie' : 'Utworz pierwsze konto'}
        </Button>
        <small>
          {hasUsers === null
            ? 'Sprawdzam status konta...'
            : hasUsers
              ? 'Logowanie email + haslo.'
              : 'Pierwszy uzytkownik: utworz konto email + haslo.'}
        </small>
      </div>
    </section>
  );
}
