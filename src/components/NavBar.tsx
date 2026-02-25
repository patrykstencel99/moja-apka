'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { uiCopy } from '@/lib/copy';

type NavHref = '/today' | '/systems' | '/review' | '/journal' | '/experiments' | '/settings';

export function NavBar() {
  const pathname = usePathname();

  const isPrimaryActive = (href: NavHref) => pathname === href || pathname.startsWith(`${href}/`);
  const primaryLinks: Array<{ href: NavHref; label: string }> = [
    { href: '/today', label: uiCopy.nav.today },
    { href: '/systems', label: uiCopy.nav.systems },
    { href: '/review', label: uiCopy.nav.review }
  ];
  const secondaryLinks: Array<{ href: NavHref; label: string }> = [
    { href: '/journal', label: uiCopy.nav.journal },
    { href: '/experiments', label: uiCopy.nav.experiments },
    { href: '/settings', label: uiCopy.nav.settings }
  ];

  return (
    <nav aria-label={uiCopy.nav.primaryAriaLabel} className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">PF</span>
        <div className="stack-sm">
          <div className="brand-title">PatternFinder</div>
          <div className="brand-subtitle">{uiCopy.nav.brandSubtitle}</div>
        </div>
      </div>

      <div className="sidebar-group">
        <p className="sidebar-group-title">{uiCopy.nav.primaryAriaLabel}</p>
        <div className="sidebar-links">
          {primaryLinks.map((link) => (
            <Link
              aria-current={isPrimaryActive(link.href) ? 'page' : undefined}
              className={`sidebar-link ${isPrimaryActive(link.href) ? 'active' : ''}`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="sidebar-group">
        <p className="sidebar-group-title">{uiCopy.nav.menu}</p>
        <div className="sidebar-links">
          {secondaryLinks.map((link) => (
            <Link
              aria-current={isPrimaryActive(link.href) ? 'page' : undefined}
              className={`sidebar-link ${isPrimaryActive(link.href) ? 'active' : ''}`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="nav-mode">{uiCopy.nav.modeLabel}</span>
      </div>
    </nav>
  );
}
