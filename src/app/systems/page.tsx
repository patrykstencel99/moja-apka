import { NavBar } from '@/components/NavBar';
import { SystemsClient } from '@/components/systems/SystemsClient';

export default function SystemsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Starter Systems</span>
          <h1>Nie konfigurujesz aplikacji. Aktywujesz system pod wynik.</h1>
          <p className="hero-support">
            Najpierw core, potem advanced. Domyslne definicje i progi zdejmują koszt decyzji.
          </p>
        </header>
        <SystemsClient />
      </section>
    </main>
  );
}
