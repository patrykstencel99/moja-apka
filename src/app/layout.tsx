import type { Metadata } from 'next';
import './globals.css';

import { PwaRegister } from '@/components/PwaRegister';
import { getServerUser } from '@/lib/auth';
import { uiCopy } from '@/lib/copy';
import { getThemeDefinition } from '@/lib/fun';

export const metadata: Metadata = {
  title: 'PatternFinder',
  description: uiCopy.meta.description,
  manifest: '/manifest.webmanifest'
};

export const dynamic = 'force-dynamic';

async function resolveTheme() {
  try {
    const user = await getServerUser();
    const candidate = user.themeKey ?? 'obsidian-command';
    return getThemeDefinition(candidate) ? candidate : 'obsidian-command';
  } catch {
    return 'obsidian-command';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await resolveTheme();

  return (
    <html data-theme={theme} lang="pl">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
