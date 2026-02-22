import type { Metadata } from 'next';
import './globals.css';

import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'PatternFinder',
  description: 'Cockpit samoregulacji: codzienne decyzje, energia i wzorce',
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
