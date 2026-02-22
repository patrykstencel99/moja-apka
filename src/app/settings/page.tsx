import { NavBar } from '@/components/NavBar';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default function SettingsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Secondary</span>
          <h1>Ustawienia</h1>
          <p className="hero-support">Sesja, backup, export i prywatnosc.</p>
        </header>
        <SettingsClient />
      </section>
    </main>
  );
}
