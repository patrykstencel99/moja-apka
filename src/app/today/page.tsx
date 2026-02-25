import { NavBar } from '@/components/NavBar';
import { TodayClient } from '@/components/TodayClient';
import { uiCopy } from '@/lib/copy';

export default function TodayPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.today.eyebrow}</span>
          <h1>{uiCopy.pages.today.title}</h1>
          <p className="hero-support">{uiCopy.pages.today.support}</p>
        </header>
        <TodayClient />
      </section>
    </main>
  );
}
