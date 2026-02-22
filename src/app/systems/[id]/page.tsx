import { notFound } from 'next/navigation';

import { NavBar } from '@/components/NavBar';
import { SystemDetailClient } from '@/components/systems/SystemDetailClient';
import { STARTER_SYSTEMS } from '@/lib/starter-packs';

type Props = {
  params: {
    id: string;
  };
};

export default function SystemDetailPage({ params }: Props) {
  const system = STARTER_SYSTEMS.find((item) => item.id === params.id);

  if (!system) {
    notFound();
  }

  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">System</span>
          <h1>{system.name}</h1>
          <p className="hero-support">Aktywacja, doprecyzowanie i codzienne uzycie na Today.</p>
        </header>
        <SystemDetailClient system={system} />
      </section>
    </main>
  );
}
