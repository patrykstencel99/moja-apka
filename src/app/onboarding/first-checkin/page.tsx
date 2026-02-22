import { TodayClient } from '@/components/TodayClient';

export default function OnboardingFirstCheckInPage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Onboarding 3/3</span>
          <h1>Pierwszy check-in</h1>
          <p className="hero-support">Zrob szybki capture i od razu ustaw pierwszy Next Move.</p>
        </header>
        <TodayClient onboardingMode />
      </section>
    </main>
  );
}
