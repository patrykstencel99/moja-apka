'use client';

import { Button } from '@/components/ui/Button';

type Props = {
  error: Error;
  reset: () => void;
};

export default function SystemsError({ error, reset }: Props) {
  return (
    <main className="page-shell">
      <section className="panel stack">
        <header className="hero-header">
          <span className="eyebrow">Starter Systems</span>
          <h1>Nie udalo sie zaladowac ekranu systemow</h1>
          <p className="hero-support">{error.message || 'Wystapil nieoczekiwany blad.'}</p>
        </header>
        <Button onClick={reset} size="lg" variant="primary">
          Sprobuj ponownie
        </Button>
      </section>
    </main>
  );
}
