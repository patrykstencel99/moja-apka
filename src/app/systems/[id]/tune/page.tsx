import { notFound } from 'next/navigation';

import { NavBar } from '@/components/NavBar';
import { SystemTuneClient } from '@/components/systems/SystemTuneClient';
import { STARTER_SYSTEMS } from '@/lib/starter-packs';

type Props = {
  params: {
    id: string;
  };
};

export default function SystemTunePage({ params }: Props) {
  const system = STARTER_SYSTEMS.find((item) => item.id === params.id);

  if (!system) {
    notFound();
  }

  return (
    <main className="page-shell">
      <NavBar />
      <section className="panel">
        <header className="hero-header">
          <span className="eyebrow">Doprecyzowanie</span>
          <h1>{system.name}</h1>
          <p className="hero-support">Dostosuj typ i cadence sygnalow do realnego rytmu dnia.</p>
        </header>
        <SystemTuneClient system={system} />
      </section>
    </main>
  );
}
