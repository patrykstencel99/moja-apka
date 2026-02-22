import { NavBar } from '@/components/NavBar';
import { ReviewClient } from '@/components/review/ReviewClient';

export default function ReviewPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Review 2x / 5x / 10x</span>
          <h1>To hipotezy decyzyjne, nie galerie wykresow.</h1>
          <p className="hero-support">
            Gdy danych jest malo dostajesz eksperyment tygodnia. Gdy danych jest duzo: Top gain, Top risk i Next test.
          </p>
        </header>
        <ReviewClient />
      </section>
    </main>
  );
}
