#!/usr/bin/env node

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

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (typeof result.status !== 'number' || result.status !== 0) {
    const stderr = (result.stderr ?? '').trim();
    if (stderr) {
      console.error(stderr);
    }
    process.exit(result.status ?? 1);
  }

  return (result.stdout ?? '').trim();
}

function ensureMainBranch() {
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') {
    console.error(`Jestes na branchu "${branch}". Przelacz na "main" i odpal ponownie.`);
    process.exit(1);
  }
}

function hasChanges() {
  const status = capture('git', ['status', '--porcelain']);
  return status.length > 0;
}

function schemaChanged() {
  const changed = capture('git', ['diff', '--name-only', 'HEAD']);
  return changed.split('\n').includes('prisma/schema.prisma');
}

function defaultMessage() {
  const now = new Date();
  const iso = now.toISOString().replace('T', ' ').slice(0, 16);
  return `chore: release ${iso} UTC`;
}

ensureMainBranch();

if (!hasChanges()) {
  console.log('Brak zmian do wdrozenia.');
  process.exit(0);
}

const commitMessage = process.argv.slice(2).join(' ').trim() || defaultMessage();

run('npm', ['run', 'doctor']);
run('npm', ['run', 'build']);

if (schemaChanged()) {
  run('npm', ['run', 'prisma:push']);
}

run('git', ['add', '-A']);
run('git', ['commit', '-m', commitMessage]);
run('git', ['push', 'origin', 'main']);

console.log('\nWyslane na GitHub. Vercel zrobi deploy automatycznie.');
