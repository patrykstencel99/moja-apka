import { NavBar } from '@/components/NavBar';
import { ExperimentsClient } from '@/components/experiments/ExperimentsClient';
import { uiCopy } from '@/lib/copy';

export default function ExperimentsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.experiments.eyebrow}</span>
          <h1>{uiCopy.pages.experiments.title}</h1>
          <p className="hero-support">{uiCopy.pages.experiments.support}</p>
        </header>
        <ExperimentsClient />
      </section>
    </main>
  );
}
