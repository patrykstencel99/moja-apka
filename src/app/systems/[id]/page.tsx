import { notFound } from 'next/navigation';

import { NavBar } from '@/components/NavBar';
import { SystemDetailClient } from '@/components/systems/SystemDetailClient';
import { uiCopy } from '@/lib/copy';
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
          <span className="eyebrow">{uiCopy.pages.systemDetail.eyebrow}</span>
          <h1>{system.name}</h1>
          <p className="hero-support">{uiCopy.pages.systemDetail.support}</p>
        </header>
        <SystemDetailClient system={system} />
      </section>
    </main>
  );
}
