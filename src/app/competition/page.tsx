import { NavBar } from '@/components/NavBar';
import { CompetitionClient } from '@/components/competition/CompetitionClient';
import { uiCopy } from '@/lib/copy';

export default function CompetitionPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.competition.eyebrow}</span>
          <h1>{uiCopy.pages.competition.title}</h1>
          <p className="hero-support">{uiCopy.pages.competition.support}</p>
        </header>
        <CompetitionClient />
      </section>
    </main>
  );
}
