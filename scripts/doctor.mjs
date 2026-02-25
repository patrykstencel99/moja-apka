#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const issues = [];
const warnings = [];

const DATABASE_URL_KEYS = ['POSTGRES_PRISMA_URL', 'DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING'];

const databaseEntry = DATABASE_URL_KEYS.map((key) => ({ key, value: process.env[key]?.trim() ?? '' })).find(
  (entry) => entry.value
);
const databaseUrl = databaseEntry?.value;
const sessionSecret = process.env.SESSION_SECRET?.trim();
const appUrl = process.env.APP_URL?.trim();

if (!databaseUrl) {
  issues.push('Brak URL bazy (ustaw DATABASE_URL lub POSTGRES_PRISMA_URL).');
} else if (
  databaseUrl.includes('USER:PASSWORD@HOST') ||
  databaseUrl.includes('postgresql://USER') ||
  databaseUrl.includes('HOST:5432')
) {
  issues.push(`${databaseEntry?.key ?? 'DATABASE_URL'} ma placeholder.`);
}

if (!sessionSecret) {
  issues.push('Brak SESSION_SECRET.');
} else if (sessionSecret.includes('replace-with-long-random-secret')) {
  warnings.push('SESSION_SECRET jest tymczasowy (ok lokalnie, zly na produkcje).');
}

if (!appUrl) {
  warnings.push('Brak APP_URL.');
}

if (issues.length === 0) {
  const prisma = new PrismaClient({ log: ['error'] });
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (databaseEntry?.key && databaseEntry.key !== 'DATABASE_URL') {
      warnings.push(`Polaczenie bazy idzie przez ${databaseEntry.key}.`);
    }
  } catch {
    issues.push(`Brak polaczenia z baza (${databaseEntry?.key ?? 'DATABASE_URL'} nie dziala).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (issues.length === 0) {
  console.log('OK: runtime gotowy.');
} else {
  console.log('BLEDY:');
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
}

if (warnings.length > 0) {
  console.log('UWAGI:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (issues.length > 0) {
  console.log('\nNapraw i uruchom ponownie: npm run doctor');
  process.exit(1);
}
