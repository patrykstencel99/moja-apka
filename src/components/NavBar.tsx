'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <span className="brand-mark">PF</span>
        <div>
          <div className="brand-title">PatternFinder</div>
          <div className="brand-subtitle">Cockpit samoregulacji i decyzji dziennych</div>
        </div>
      </div>

      <div className="nav-links" role="navigation">
        <Link className={pathname === '/dashboard' ? 'active' : ''} href="/dashboard">
          Daily
        </Link>
        <Link className={pathname === '/setup' ? 'active' : ''} href="/setup">
          Setup
        </Link>
        <Link className={pathname === '/reports' ? 'active' : ''} href="/reports">
          Raporty
        </Link>
      </div>

      <span className="nav-mode">Performance Builder</span>
    </nav>
  );
}
