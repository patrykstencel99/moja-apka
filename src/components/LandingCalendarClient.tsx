'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { uiCopy } from '@/lib/copy';

const DOTS_TOTAL = 365;
const DIVE_FADE_DELAY_MS = 1080;
const DIVE_NAV_DELAY_MS = 2250;

type DivePoint = {
  x: number;
  y: number;
  size: number;
  scale: number;
};

export function LandingCalendarClient() {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [revealReady, setRevealReady] = useState(false);
  const [dotDelays, setDotDelays] = useState<number[]>(() => Array.from({ length: DOTS_TOTAL }, () => 0));
  const [divePoint, setDivePoint] = useState<DivePoint | null>(null);
  const [isDiving, setIsDiving] = useState(false);
  const [veilVisible, setVeilVisible] = useState(false);

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
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const cornerDistances = [
      Math.hypot(centerX, centerY),
      Math.hypot(window.innerWidth - centerX, centerY),
      Math.hypot(centerX, window.innerHeight - centerY),
      Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY)
    ];
    const maxDistance = Math.max(...cornerDistances);
    const baseSize = Math.max(10, rect.width);
    const targetScale = Math.max(220, Math.ceil((maxDistance * Math.SQRT2) / baseSize) + 40);

    setSelectedDot(index);
    setNavigating(true);
    setDivePoint({
      x: centerX,
      y: centerY,
      size: baseSize,
      scale: targetScale
    });
    setIsDiving(false);
    setVeilVisible(false);

    window.requestAnimationFrame(() => {
      setIsDiving(true);
    });

    window.setTimeout(() => {
      setVeilVisible(true);
    }, DIVE_FADE_DELAY_MS);

    window.setTimeout(() => {
      window.sessionStorage.setItem('pf-login-transition', 'landing-dive');
      router.push('/login');
    }, DIVE_NAV_DELAY_MS);
  };

  return (
    <section className={['landing-galaxy', isDiving ? 'is-diving' : ''].join(' ')}>
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
        <h2 className="landing-title-secondary">
          {uiCopy.landing.titleSecondaryLead}{' '}
          <span className="landing-emphasis landing-emphasis--green">{uiCopy.landing.titleSecondaryGreen}</span>{' '}
          {uiCopy.landing.titleSecondaryJoiner}{' '}
          <span className="landing-emphasis landing-emphasis--red">
            <span className="landing-emphasis-red-text">{uiCopy.landing.titleSecondaryRed}</span>
            <svg className="landing-red-loop" viewBox="0 0 300 90" preserveAspectRatio="none">
              <path className="landing-red-loop-main" d="M12 52 C 24 15, 276 4, 286 43 C 295 80, 18 91, 12 52 Z" />
              <path className="landing-red-loop-accent" d="M16 54 C 34 20, 268 10, 280 44 C 288 74, 28 84, 16 54 Z" />
            </svg>
          </span>
        </h2>
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
          className={['landing-dive', isDiving ? 'is-active' : ''].join(' ')}
          style={
            {
              '--dive-x': `${divePoint.x}px`,
              '--dive-y': `${divePoint.y}px`,
              '--dive-size': `${Math.max(10, divePoint.size)}px`,
              '--dive-scale': String(divePoint.scale)
            } as CSSProperties
          }
        />
      )}

      <div aria-hidden className={['landing-transition-veil', veilVisible ? 'is-visible' : ''].join(' ')} />
    </section>
  );
}
