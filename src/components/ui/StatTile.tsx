import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function StatTile({ label, value, hint, trend = 'neutral' }: Props) {
  return (
    <div className="stat-tile" data-trend={trend}>
      <span className="stat-tile__label">{label}</span>
      <strong className="stat-tile__value">{value}</strong>
      {hint && <small className="stat-tile__hint">{hint}</small>}
    </div>
  );
}
