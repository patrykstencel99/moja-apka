'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { uiCopy } from '@/lib/copy';

const DOTS_TOTAL = 365;
const DIVE_NAV_DELAY_MS = 980;

type DivePoint = {
  x: number;
  y: number;
  size: number;
};

export function LandingCalendarClient() {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [revealReady, setRevealReady] = useState(false);
  const [dotDelays, setDotDelays] = useState<number[]>(() => Array.from({ length: DOTS_TOTAL }, () => 0));
  const [divePoint, setDivePoint] = useState<DivePoint | null>(null);
  const [divePhase, setDivePhase] = useState<'idle' | 'expanding' | 'fading'>('idle');

  const dots = useMemo(() => Array.from({ length: DOTS_TOTAL }, (_, index) => index), []);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) {
      return;
    }

    let raf = 0;

    const computeDelays = () => {
      const templateColumns = window
        .getComputedStyle(node)
        .getPropertyValue('grid-template-columns')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const columns = Math.max(1, templateColumns.length);
      const rows = Math.ceil(DOTS_TOTAL / columns);
      const centerRow = (rows - 1) / 2;
      const centerCol = (columns - 1) / 2;
      const maxDistance = Math.hypot(centerRow, centerCol) || 1;

      const nextDelays = Array.from({ length: DOTS_TOTAL }, (_, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const distance = Math.hypot(row - centerRow, col - centerCol);
        const normalized = distance / maxDistance;
        const checkerOffset = ((row + col) % 2) * 44;
        return Math.round(220 + normalized * 2150 + checkerOffset);
      });

      setDotDelays(nextDelays);
      setRevealReady(true);
    };

    const scheduleRecompute = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(computeDelays);
    };

    scheduleRecompute();

    const observer = new ResizeObserver(() => {
      scheduleRecompute();
    });
    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const handleDotClick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    if (navigating) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedDot(index);
    setNavigating(true);
    setDivePoint({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: rect.width
    });
    setDivePhase('expanding');

    window.setTimeout(() => {
      setDivePhase('fading');
    }, 620);

    window.setTimeout(() => {
      router.push('/login');
    }, DIVE_NAV_DELAY_MS);
  };

  return (
    <section className={['landing-galaxy', divePhase !== 'idle' ? 'is-diving' : ''].join(' ')}>
      <div aria-hidden className="landing-cosmos-art">
        <span className="landing-orbit landing-orbit--outer" />
        <span className="landing-orbit landing-orbit--inner" />
        <span className="landing-planet" />
        <span className="landing-star landing-star--a" />
        <span className="landing-star landing-star--b" />
        <span className="landing-star landing-star--c" />
        <span className="landing-star landing-star--d" />
      </div>

      <div className="landing-inner">
        <p className="landing-eyebrow">{uiCopy.landing.eyebrow}</p>
        <h1 className="landing-title">{uiCopy.landing.title}</h1>
        <p className="landing-subtitle">{uiCopy.landing.subtitle}</p>

        <div className="landing-grid-wrap">
          <div className={['landing-grid', revealReady ? 'is-revealed' : ''].join(' ')} ref={gridRef}>
            {dots.map((index) => (
              <button
                aria-label={uiCopy.landing.dayAriaLabelTemplate.replace('{day}', String(index + 1))}
                className={['landing-dot', selectedDot === index ? 'is-selected' : ''].join(' ')}
                key={index}
                onClick={(event) => handleDotClick(index, event)}
                style={{ '--dot-delay': `${dotDelays[index] ?? 0}ms` } as CSSProperties}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>

      {divePoint && (
        <div
          aria-hidden
          className={['landing-dive', divePhase === 'expanding' ? 'is-expanding' : '', divePhase === 'fading' ? 'is-fading' : '']
            .filter(Boolean)
            .join(' ')}
          style={
            {
              '--dive-x': `${divePoint.x}px`,
              '--dive-y': `${divePoint.y}px`,
              '--dive-size': `${Math.max(10, divePoint.size)}px`
            } as CSSProperties
          }
        />
      )}

      <div aria-hidden className={['landing-transition-veil', divePhase === 'fading' ? 'is-visible' : ''].join(' ')} />
    </section>
  );
}
