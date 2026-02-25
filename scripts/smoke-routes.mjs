#!/usr/bin/env node

import { spawn } from 'node:child_process';

const HOST = process.env.SMOKE_HOST?.trim() || '127.0.0.1';
const PORT = Number.parseInt(process.env.SMOKE_PORT?.trim() || '4030', 10);
const BASE_URL = process.env.SMOKE_BASE_URL?.trim() || `http://${HOST}:${PORT}`;
const SHOULD_START_SERVER = process.env.SMOKE_START !== '0';
const ROUTES = ['/today', '/systems', '/review'];
const STARTUP_TIMEOUT_SECONDS = Number.parseInt(process.env.SMOKE_STARTUP_TIMEOUT?.trim() || '90', 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_REQUEST_TIMEOUT_MS?.trim() || '4000', 10);

if (!Number.isFinite(PORT) || PORT <= 0) {
  console.error('BLEDNY SMOKE_PORT.');
  process.exit(1);
}

const logs = [];
const keepLogLine = (line) => {
  logs.push(line);
  if (logs.length > 200) {
    logs.shift();
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchStatus(pathname) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      redirect: 'manual',
      signal: controller.signal
    });
    return response.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForServerReady() {
  for (let i = 0; i < STARTUP_TIMEOUT_SECONDS; i += 1) {
    const status = await fetchStatus('/');
    if (status !== 0) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

function printRecentLogs() {
  if (logs.length === 0) {
    return;
  }

  console.error('\nOstatnie logi serwera:');
  for (const line of logs) {
    console.error(line);
  }
}

async function main() {
  let server = null;

  if (SHOULD_START_SERVER) {
    server = spawn('npm', ['run', 'start', '--', '-H', HOST, '-p', String(PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    server.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) {
          keepLogLine(line);
        }
      }
    });

    server.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) {
          keepLogLine(line);
        }
      }
    });
  }

  try {
    const ready = await waitForServerReady();
    if (!ready) {
      console.error(`Smoke FAIL: serwer nie wystartowal pod ${BASE_URL} w ${STARTUP_TIMEOUT_SECONDS}s.`);
      printRecentLogs();
      process.exit(1);
    }

    let failed = false;
    for (const route of ROUTES) {
      const status = await fetchStatus(route);
      const ok = status >= 200 && status < 400;
      const label = ok ? 'OK' : 'FAIL';
      console.log(`SMOKE ${route} -> ${status} (${label})`);
      if (!ok) {
        failed = true;
      }
    }

    if (failed) {
      printRecentLogs();
      process.exit(1);
    }

    console.log('Smoke OK: wszystkie trasy odpowiedzialy 2xx/3xx.');
  } finally {
    if (server && !server.killed) {
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => server.once('exit', resolve)),
        sleep(3000)
      ]);
      if (!server.killed) {
        server.kill('SIGKILL');
      }
    }
  }
}

await main();
