import { NavBar } from '@/components/NavBar';
import { ReportsClient } from '@/components/ReportsClient';
export default function ReportsPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Warstwa analityczna</span>
          <h1>Wnioski, ktore prowadza do kolejnej decyzji</h1>
          <p className="hero-support">
            Raporty sa hipotezami statystycznymi i nie stanowia porady medycznej. Traktuj je jako sygnal do testu na
            nastepny dzien.
          </p>
        </header>
        <ReportsClient />
      </section>
    </main>
  );
}
