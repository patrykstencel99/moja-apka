import { NavBar } from '@/components/NavBar';
import { TodayClient } from '@/components/TodayClient';

export default function TodayPage() {
  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <TodayClient />
      </section>
    </main>
  );
}
