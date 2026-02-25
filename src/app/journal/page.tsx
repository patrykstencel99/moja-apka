import { NavBar } from '@/components/NavBar';
import { JournalClient } from '@/components/journal/JournalClient';
import { uiCopy } from '@/lib/copy';

export default function JournalPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.journal.eyebrow}</span>
          <h1>{uiCopy.pages.journal.title}</h1>
          <p className="hero-support">{uiCopy.pages.journal.support}</p>
        </header>
        <JournalClient />
      </section>
    </main>
  );
}
