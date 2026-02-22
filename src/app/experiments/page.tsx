import { NavBar } from '@/components/NavBar';
import { ExperimentsClient } from '@/components/experiments/ExperimentsClient';

export default function ExperimentsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Secondary</span>
          <h1>Eksperymenty</h1>
          <p className="hero-support">Historia Next Move i wyniki iteracji.</p>
        </header>
        <ExperimentsClient />
      </section>
    </main>
  );
}
