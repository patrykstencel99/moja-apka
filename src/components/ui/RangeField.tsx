import type { InputHTMLAttributes } from 'react';

type Props = {
  label: string;
  value: number;
  descriptor?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'>;

export function RangeField({ label, value, descriptor, className, ...rest }: Props) {
  return (
    <label className={["range-field", className ?? ''].filter(Boolean).join(' ')}>
      <div className="range-field__top">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input className="range-field__input" type="range" value={value} {...rest} />
      {descriptor && <small className="range-field__descriptor">{descriptor}</small>}
    </label>
  );
}
