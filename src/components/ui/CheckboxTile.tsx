import type { InputHTMLAttributes, ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  checked: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked'>;

export function CheckboxTile({ title, subtitle, icon, checked, className, ...rest }: Props) {
  return (
    <label className={["checkbox-tile", checked ? 'is-checked' : '', className ?? ''].filter(Boolean).join(' ')}>
      <div className="checkbox-tile__head">
        <span className="checkbox-tile__icon">{icon}</span>
        <div>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
      </div>
      <input checked={checked} type="checkbox" {...rest} />
    </label>
  );
}
