import type { ReactNode } from 'react';

type BannerTone = 'info' | 'warning' | 'success' | 'danger';

type Props = {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
};

export function Banner({ tone = 'info', title, children }: Props) {
  return (
    <div className="ui-banner" data-tone={tone}>
      {title && <strong className="ui-banner__title">{title}</strong>}
      <p>{children}</p>
    </div>
  );
}
