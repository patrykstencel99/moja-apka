'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo } from 'react';

import { uiCopy } from '@/lib/copy';
import { prefetchRouteData } from '@/lib/route-prefetch';

type NavHref = '/today' | '/systems' | '/review' | '/competition' | '/journal' | '/experiments' | '/settings';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isPrimaryActive = (href: NavHref) => pathname === href || pathname.startsWith(`${href}/`);
  const primaryLinks = useMemo<Array<{ href: NavHref; label: string }>>(
    () => [
      { href: '/today', label: uiCopy.nav.today },
      { href: '/systems', label: uiCopy.nav.systems },
      { href: '/review', label: uiCopy.nav.review },
      { href: '/competition', label: uiCopy.nav.competition }
    ],
    []
  );
  const secondaryLinks = useMemo<Array<{ href: NavHref; label: string }>>(
    () => [
      { href: '/journal', label: uiCopy.nav.journal },
      { href: '/experiments', label: uiCopy.nav.experiments },
      { href: '/settings', label: uiCopy.nav.settings }
    ],
    []
  );
  const allLinks = useMemo(() => [...primaryLinks, ...secondaryLinks], [primaryLinks, secondaryLinks]);

  const warmBundle = useCallback(
    (href: NavHref) => {
      router.prefetch(href);
    },
    [router]
  );

  const warmData = useCallback((href: NavHref) => {
    void prefetchRouteData(href);
  }, []);

  useEffect(() => {
    for (const link of allLinks) {
      warmBundle(link.href);
    }
  }, [allLinks, warmBundle]);

  useEffect(() => {
    document.documentElement.classList.remove('route-transitioning');
  }, [pathname]);

  const handleTransitionNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: NavHref) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (pathname === href) {
        return;
      }

      event.preventDefault();
      const root = document.documentElement;
      root.classList.add('route-transitioning');

      const docWithTransition = document as Document & {
        startViewTransition?: (callback: () => void) => { finished?: Promise<void> };
      };

      const clear = () => {
        root.classList.remove('route-transitioning');
      };

      if (typeof docWithTransition.startViewTransition === 'function') {
        const transition = docWithTransition.startViewTransition(() => {
          router.push(href);
        });

        if (transition?.finished) {
          void transition.finished.finally(clear);
        } else {
          window.setTimeout(clear, 900);
        }
        return;
      }

      router.push(href);
      window.setTimeout(clear, 720);
    },
    [pathname, router]
  );

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
              onClick={(event) => handleTransitionNavigation(event, link.href)}
              onFocus={() => {
                warmBundle(link.href);
                warmData(link.href);
              }}
              onMouseEnter={() => {
                warmBundle(link.href);
                warmData(link.href);
              }}
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
              onClick={(event) => handleTransitionNavigation(event, link.href)}
              onFocus={() => {
                warmBundle(link.href);
                warmData(link.href);
              }}
              onMouseEnter={() => {
                warmBundle(link.href);
                warmData(link.href);
              }}
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
