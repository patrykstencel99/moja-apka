#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import EmbeddedPostgres from 'embedded-postgres';

const DATABASE_NAME = 'patternfinder';
const DATABASE_PORT = 5432;
const DATABASE_USER = 'postgres';
const DATABASE_PASSWORD = 'password';
const DATA_DIR = resolve(process.cwd(), '.embedded-postgres');
const PID_FILE = resolve(DATA_DIR, 'postmaster.pid');
const PG_VERSION_FILE = resolve(DATA_DIR, 'PG_VERSION');

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
  port: DATABASE_PORT,
  persistent: true
});

let nextDevProcess = null;
let shuttingDown = false;

async function isEmbeddedPostgresRunning() {
  try {
    const content = await readFile(PID_FILE, 'utf8');
    const pid = Number(content.split('\n')[0]?.trim());
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, env = process.env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`Polecenie zakonczone kodem ${code ?? 'null'}: ${command} ${args.join(' ')}`));
    });
  });
}

async function stopDatabase() {
  try {
    await pg.stop();
  } catch {
    // Ignore shutdown errors
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (nextDevProcess && !nextDevProcess.killed) {
    nextDevProcess.kill('SIGTERM');
  }

  await stopDatabase();
  process.exit(exitCode);
}

async function ensureDatabase() {
  let needsInitialise = true;
  try {
    await access(PG_VERSION_FILE);
    needsInitialise = false;
  } catch {
    needsInitialise = true;
  }

  if (needsInitialise) {
    try {
      await pg.initialise();
    } catch (error) {
      const message = String(error).toLowerCase();
      if (!message.includes('data directory might already exist')) {
        throw error;
      }
    }
  }
  try {
    await pg.start();
  } catch (error) {
    const message = String(error ?? '').toLowerCase();
    const alreadyRunning =
      message.includes('postmaster.pid') ||
      message.includes('already running') ||
      message.includes('lock file') ||
      (await isEmbeddedPostgresRunning());
    if (!alreadyRunning) {
      throw error;
    }
    console.log('DB: wykryto dzialajacy lokalny postgres, kontynuacja bez restartu.');
  }

  try {
    await pg.createDatabase(DATABASE_NAME);
    console.log(`DB: utworzono baze ${DATABASE_NAME}.`);
  } catch (error) {
    const message = String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
}

async function clearNextCache() {
  if (process.env.DEV_KEEP_NEXT_CACHE === '1') {
    return;
  }

  try {
    await rm(resolve(process.cwd(), '.next'), { recursive: true, force: true });
    console.log('NEXT: wyczyszczono cache .next');
  } catch (error) {
    console.warn('NEXT: nie udalo sie wyczyscic cache .next, startuje dalej.', error);
  }
}

async function main() {
  process.on('SIGINT', () => {
    void shutdown(0);
  });
  process.on('SIGTERM', () => {
    void shutdown(0);
  });

  try {
    await clearNextCache();
    await ensureDatabase();

    const databaseUrl = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@127.0.0.1:${DATABASE_PORT}/${DATABASE_NAME}?schema=public`;
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl
    };

    await runCommand('npx', ['prisma', 'db', 'push'], env);

    nextDevProcess = spawn('next', ['dev'], {
      stdio: 'inherit',
      env
    });

    nextDevProcess.on('error', (error) => {
      console.error('Nie udalo sie uruchomic next dev:', error);
      void shutdown(1);
    });

    nextDevProcess.on('exit', (code) => {
      void shutdown(code ?? 0);
    });
  } catch (error) {
    console.error('Nie udalo sie uruchomic lokalnej bazy lub aplikacji.');
    console.error(error);
    await shutdown(1);
  }
}

await main();
