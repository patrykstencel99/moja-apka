import { NavBar } from '@/components/NavBar';
import { SystemsClient } from '@/components/systems/SystemsClient';
import { uiCopy } from '@/lib/copy';

export default function SystemsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.systems.eyebrow}</span>
          <h1>{uiCopy.pages.systems.title}</h1>
          <p className="hero-support">{uiCopy.pages.systems.support}</p>
        </header>
        <SystemsClient />
      </section>
    </main>
  );
}
