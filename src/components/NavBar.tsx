'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
  const pathname = usePathname();

  const isPrimaryActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <span className="brand-mark">PF</span>
        <div>
          <div className="brand-title">PatternFinder</div>
          <div className="brand-subtitle">Operacyjny cockpit decyzji: 1 petla dziennie</div>
        </div>
      </div>

      <div className="nav-links" role="navigation" aria-label="Primary navigation">
        <Link className={isPrimaryActive('/today') ? 'active' : ''} href="/today">
          Dzien (1x)
        </Link>
        <Link className={isPrimaryActive('/systems') ? 'active' : ''} href="/systems">
          Systems
        </Link>
        <Link className={isPrimaryActive('/review') ? 'active' : ''} href="/review">
          Review (2x/5x/10x)
        </Link>
      </div>

      <div className="nav-secondary-wrap">
        <details className="nav-secondary">
          <summary>Menu</summary>
          <div className="nav-secondary-menu">
            <Link className={isPrimaryActive('/experiments') ? 'active' : ''} href="/experiments">
              Eksperymenty
            </Link>
            <Link className={isPrimaryActive('/settings') ? 'active' : ''} href="/settings">
              Ustawienia
            </Link>
          </div>
        </details>
        <span className="nav-mode">Performance Builder</span>
      </div>
    </nav>
  );
}
