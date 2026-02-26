#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`\n> ${printable}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options
  });

  if (typeof result.status !== 'number' || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseDotEnv(content) {
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index <= 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function resolveProdDatabaseUrl(env) {
  const candidates = ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL', 'POSTGRES_PRISMA_URL'];
  for (const key of candidates) {
    const value = env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizeForSchemaPush(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('pooler.supabase.com') && parsed.port === '6543') {
      // Port 5432 on Supabase pooler is session mode and works for schema operations.
      parsed.port = '5432';
      parsed.searchParams.delete('pgbouncer');
      parsed.searchParams.delete('connection_limit');
      if (!parsed.searchParams.get('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function describeHost(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return 'INVALID_DATABASE_URL';
  }
}

run('npx', ['vercel', 'pull', '--yes', '--environment=production']);

const envFilePath = '.vercel/.env.production.local';
const envContent = readFileSync(envFilePath, 'utf8');
const pulledEnv = parseDotEnv(envContent);
const resolvedUrl = resolveProdDatabaseUrl(pulledEnv);

if (!resolvedUrl) {
  console.error(`Brak produkcyjnego URL bazy w ${envFilePath}.`);
  console.error('Dodaj DATABASE_URL albo POSTGRES_PRISMA_URL w Vercel Environment Variables.');
  process.exit(1);
}

const schemaUrl = normalizeForSchemaPush(resolvedUrl);
console.log(`\nUzywam produkcyjnej bazy: ${describeHost(schemaUrl)}`);

run(
  'npx',
  ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate', '--accept-data-loss'],
  {
    env: {
      ...process.env,
      DATABASE_URL: schemaUrl
    }
  }
);

console.log('\nSchemat produkcyjny zsynchronizowany.');
