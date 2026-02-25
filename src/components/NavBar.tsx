'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { uiCopy } from '@/lib/copy';

export function NavBar() {
  const pathname = usePathname();

  const isPrimaryActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <span className="brand-mark">PF</span>
        <div>
          <div className="brand-title">PatternFinder</div>
          <div className="brand-subtitle">{uiCopy.nav.brandSubtitle}</div>
        </div>
      </div>

      <div className="nav-links" role="navigation" aria-label={uiCopy.nav.primaryAriaLabel}>
        <Link className={isPrimaryActive('/today') ? 'active' : ''} href="/today">
          {uiCopy.nav.today}
        </Link>
        <Link className={isPrimaryActive('/systems') ? 'active' : ''} href="/systems">
          {uiCopy.nav.systems}
        </Link>
        <Link className={isPrimaryActive('/review') ? 'active' : ''} href="/review">
          {uiCopy.nav.review}
        </Link>
      </div>

      <div className="nav-secondary-wrap">
        <details className="nav-secondary">
          <summary>{uiCopy.nav.menu}</summary>
          <div className="nav-secondary-menu">
            <Link className={isPrimaryActive('/experiments') ? 'active' : ''} href="/experiments">
              {uiCopy.nav.experiments}
            </Link>
            <Link className={isPrimaryActive('/settings') ? 'active' : ''} href="/settings">
              {uiCopy.nav.settings}
            </Link>
          </div>
        </details>
        <span className="nav-mode">{uiCopy.nav.modeLabel}</span>
      </div>
    </nav>
  );
}
