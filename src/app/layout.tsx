import type { Metadata } from 'next';
import './globals.css';

import { PwaRegister } from '@/components/PwaRegister';
import { uiCopy } from '@/lib/copy';

export const metadata: Metadata = {
  title: 'PatternFinder',
  description: uiCopy.meta.description,
  manifest: '/manifest.webmanifest'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html data-theme="pf-premium" lang="pl">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
