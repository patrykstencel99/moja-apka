import type { HTMLAttributes, ReactNode } from 'react';

type CardTone = 'default' | 'elevated' | 'strong';

type Props = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tone?: CardTone;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function Card({ title, subtitle, actions, tone = 'default', children, className, ...rest }: Props) {
  const classes = ['ui-card', `ui-card--${tone}`, className ?? ''].filter(Boolean).join(' ');

  return (
    <article className={classes} {...rest}>
      {(title || subtitle || actions) && (
        <header className="ui-card__header">
          <div>
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ui-card__actions">{actions}</div>}
        </header>
      )}
      <div className="ui-card__body">{children}</div>
    </article>
  );
}
