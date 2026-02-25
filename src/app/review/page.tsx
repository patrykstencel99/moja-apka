import { NavBar } from '@/components/NavBar';
import { ReviewClient } from '@/components/review/ReviewClient';
import { uiCopy } from '@/lib/copy';

export default function ReviewPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">{uiCopy.pages.review.eyebrow}</span>
          <h1>{uiCopy.pages.review.title}</h1>
          <p className="hero-support">{uiCopy.pages.review.support}</p>
        </header>
        <ReviewClient />
      </section>
    </main>
  );
}
