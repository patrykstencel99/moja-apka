'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { uiCopy } from '@/lib/copy';

const DOTS_TOTAL = 365;

export function LandingCalendarClient() {
  const router = useRouter();
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [navigating, setNavigating] = useState(false);

  const dots = useMemo(() => Array.from({ length: DOTS_TOTAL }, (_, index) => index), []);

  const handleDotClick = (index: number) => {
    if (navigating) {
      return;
    }

    setSelectedDot(index);
    setNavigating(true);

    window.setTimeout(() => {
      router.push('/login');
    }, 220);
  };

  return (
    <section className="landing-galaxy">
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
          <div className="landing-grid">
            {dots.map((index) => (
              <button
                aria-label={uiCopy.landing.dayAriaLabelTemplate.replace('{day}', String(index + 1))}
                className={['landing-dot', selectedDot === index ? 'is-selected' : ''].join(' ')}
                key={index}
                onClick={() => handleDotClick(index)}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
