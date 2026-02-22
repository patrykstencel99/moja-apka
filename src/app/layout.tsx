import type { Metadata } from 'next';
import './globals.css';

import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'PatternFinder',
  description: 'Operacyjny cockpit decyzji: jedna petla dziennie, jedna korekta jutro.',
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
