import { NavBar } from '@/components/NavBar';
import { SetupManager } from '@/components/SetupManager';
export default function SetupPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Fundament systemu</span>
          <h1>Skonfiguruj sygnaly, ktore decyduja o Twoim dniu</h1>
          <p className="hero-support">
            Wybierz pakiety startowe, dodaj wlasne aktywnosci i ustaw strukturę, ktora pozwoli wychwytywac wzorce bez
            zgadywania.
          </p>
        </header>
        <SetupManager />
      </section>
    </main>
  );
}
