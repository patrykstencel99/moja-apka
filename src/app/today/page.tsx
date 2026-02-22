import { NavBar } from '@/components/NavBar';
import { TodayClient } from '@/components/TodayClient';

export default function TodayPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Capture - Decide - Review</span>
          <h1>Operacyjny cockpit decyzji: jedna petla dziennie, jedna korekta jutro.</h1>
          <p className="hero-support">
            Dzien (1x) to jedyny ekran akcji. Zbierasz sygnaly, zamykasz Next Move, wracasz jutro.
          </p>
        </header>
        <TodayClient />
      </section>
    </main>
  );
}
