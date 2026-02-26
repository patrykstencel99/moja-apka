'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { STORAGE_KEYS, writeBoolean, writeString } from '@/lib/state/local-storage';

const RHYTHM_OPTIONS = [
  { id: 'morning', label: 'Rano (przed startem pracy)' },
  { id: 'afternoon', label: 'Po poludniu (checkpoint dnia)' },
  { id: 'evening', label: 'Wieczor (rekomendowane)' }
] as const;

export function RhythmOnboardingClient() {
  const router = useRouter();
  const [rhythm, setRhythm] = useState<(typeof RHYTHM_OPTIONS)[number]['id']>('evening');
  const [quickDefault, setQuickDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAndContinue = () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      writeString(STORAGE_KEYS.checkInRhythm, rhythm);
      writeBoolean(STORAGE_KEYS.quickDefault, quickDefault);
      router.push('/onboarding/first-checkin');
    } catch {
      setError('Nie udalo sie zapisac preferencji rytmu. Sprobuj ponownie.');
      setIsSaving(false);
    }
  };

  return (
    <section className="stack-lg">
      <header className="hero-header">
        <span className="eyebrow">Onboarding 2/3</span>
        <h1>Ustal rytm dnia</h1>
        <p className="hero-support">Domyslnie system proponuje szybki check-in wieczorem.</p>
      </header>

      {error && (
        <Banner tone="danger" title="Problem zapisu">
          {error}
        </Banner>
      )}

      <Card title="Kiedy robisz check-in?" subtitle="Mozesz zmienic to pozniej w ustawieniach.">
        <div className="stack">
          {RHYTHM_OPTIONS.map((option) => (
            <label className="radio-row" key={option.id}>
              <input
                checked={rhythm === option.id}
                name="rhythm"
                onChange={() => setRhythm(option.id)}
                type="radio"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Tryb domyslny" subtitle="Quick Capture zamyka wpis w okolo 60 sekund.">
        <label className="checkbox-row">
          <input
            checked={quickDefault}
            onChange={(event) => setQuickDefault(event.target.checked)}
            type="checkbox"
          />
          <span>Ustaw Quick Capture (60s) jako domyslny</span>
        </label>
      </Card>

      <Button disabled={isSaving} onClick={saveAndContinue} size="lg" variant="primary">
        {isSaving ? 'Zapisywanie...' : 'Dalej: pierwszy check-in'}
      </Button>
    </section>
  );
}
