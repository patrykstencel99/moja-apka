import { NavBar } from '@/components/NavBar';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { uiCopy } from '@/lib/copy';

export default function SettingsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.settings.eyebrow}</span>
          <h1>{uiCopy.pages.settings.title}</h1>
          <p className="hero-support">{uiCopy.pages.settings.support}</p>
        </header>
        <SettingsClient />
      </section>
    </main>
  );
}
