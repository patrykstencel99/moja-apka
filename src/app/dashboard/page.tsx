import { DashboardClient } from '@/components/DashboardClient';
import { NavBar } from '@/components/NavBar';
export default function DashboardPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">System dnia</span>
          <h1>Przerywaj petle. Stabilizuj energie. Wygrywaj dni.</h1>
          <p className="hero-support">
            Codzienny cockpit, ktory zamienia obserwacje w decyzje. Minimum to jeden wpis dziennie, standard to trzy
            punkty kontrolne.
          </p>
        </header>
        <DashboardClient />
      </section>
    </main>
  );
}
