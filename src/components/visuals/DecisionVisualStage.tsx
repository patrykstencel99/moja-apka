'use client';

import Image from 'next/image';
import type { CSSProperties, PointerEvent } from 'react';
import { useMemo, useState } from 'react';

type VisualTheme = 'cockpit' | 'topography' | 'radar' | 'material';

type Props = {
  mood: number;
  energy: number;
  signals: string[];
};

const VISUAL_THEME: Record<VisualTheme, { label: string; src: string; alt: string }> = {
  cockpit: {
    label: 'Cockpit',
    src: '/visuals/cockpit-minimal.svg',
    alt: 'Minimal cockpit inspired background'
  },
  topography: {
    label: 'Topografia',
    src: '/visuals/topography-map.svg',
    alt: 'Topography inspired background'
  },
  radar: {
    label: 'Radar',
    src: '/visuals/radar-echo.svg',
    alt: 'Radar rings inspired background'
  },
  material: {
    label: 'Material',
    src: '/visuals/premium-material.svg',
    alt: 'Premium paper and metal inspired background'
  }
};

function riskLevel(mood: number, energy: number) {
  const score = Math.max(0, 10 - energy) + (mood <= 4 ? 2 : 0);
  if (score >= 8) {
    return 'wysokie';
  }
  if (score >= 5) {
    return 'srednie';
  }
  return 'niskie';
}

export function DecisionVisualStage({ mood, energy, signals }: Props) {
  const [theme, setTheme] = useState<VisualTheme>('cockpit');
  const [pointer, setPointer] = useState({ x: 58, y: 40 });

  const level = useMemo(() => riskLevel(mood, energy), [mood, energy]);

  const cssVars = {
    '--px': `${pointer.x}%`,
    '--py': `${pointer.y}%`,
    '--mood': String(mood),
    '--energy': String(energy)
  } as CSSProperties;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({
      x: Math.min(96, Math.max(4, Number(x.toFixed(2)))),
      y: Math.min(94, Math.max(6, Number(y.toFixed(2))))
    });
  };

  return (
    <section className="visual-shell">
      <div className="visual-switch" role="tablist" aria-label="Visual themes">
        {(Object.keys(VISUAL_THEME) as VisualTheme[]).map((key) => (
          <button
            aria-selected={theme === key}
            className={theme === key ? 'active' : ''}
            key={key}
            onClick={() => setTheme(key)}
            role="tab"
            type="button"
          >
            {VISUAL_THEME[key].label}
          </button>
        ))}
      </div>

      <div
        className={`visual-stage visual-stage--${level}`}
        onPointerLeave={() => setPointer({ x: 58, y: 40 })}
        onPointerMove={onPointerMove}
        style={cssVars}
      >
        <Image
          alt={VISUAL_THEME[theme].alt}
          fill
          sizes="(max-width: 1020px) 100vw, 900px"
          src={VISUAL_THEME[theme].src}
        />

        <div className="visual-stage__hud">
          <p>
            <strong>Precision Layer</strong>
          </p>
          <small>Risk: {level}</small>
          <small>Mood {mood} / Energy {energy}</small>
        </div>

        <div className="visual-stage__signal-row">
          {signals.slice(0, 3).map((signal, index) => (
            <span className="signal-dot" key={`${signal}-${index}`}>
              {signal}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
