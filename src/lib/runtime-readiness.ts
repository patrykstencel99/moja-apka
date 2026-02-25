import { prisma } from '@/lib/prisma';
import { apiCopy } from '@/lib/copy';
import { describeDatabaseHost, isPlaceholderDatabaseUrl, resolveDatabaseUrl } from '@/lib/database-url';
import { databaseSetupMessage, isDatabaseConnectionError } from '@/lib/db-errors';

export type SetupPayload = {
  code:
    | 'MISSING_DATABASE_URL'
    | 'PLACEHOLDER_DATABASE_URL'
    | 'MISSING_SESSION_SECRET'
    | 'DATABASE_UNREACHABLE'
    | 'RUNTIME_ERROR';
  title: string;
  message: string;
  steps: string[];
  diagnostics?: {
    databaseUrlSource: string | null;
    databaseHost: string | null;
  };
};

type ReadyPayload = {
  mode: 'login' | 'register';
  hasUsers: boolean;
  warnings?: string[];
};

type SetupModePayload = {
  mode: 'setup';
  hasUsers: false;
  setup: SetupPayload;
};

export type AuthStatusPayload = ReadyPayload | SetupModePayload;

const SESSION_SECRET_PLACEHOLDERS = ['replace-with-long-random-secret', 'changeme', 'placeholder'];

function isPlaceholder(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function setupPayload(input: SetupPayload): SetupModePayload {
  return {
    mode: 'setup',
    hasUsers: false,
    setup: input
  };
}

export async function resolveAuthStatus(): Promise<AuthStatusPayload> {
  const database = resolveDatabaseUrl();
  const databaseUrl = database.url;
  const diagnostics = {
    databaseUrlSource: database.source,
    databaseHost: databaseUrl ? describeDatabaseHost(databaseUrl) : null
  };
  if (!databaseUrl) {
    return setupPayload({
      code: 'MISSING_DATABASE_URL',
      title: apiCopy.runtime.missingDatabaseUrlTitle,
      message: apiCopy.runtime.missingDatabaseUrlMessage,
      steps: [...apiCopy.runtime.missingDatabaseUrlSteps],
      diagnostics
    });
  }

  if (isPlaceholderDatabaseUrl(databaseUrl)) {
    return setupPayload({
      code: 'PLACEHOLDER_DATABASE_URL',
      title: apiCopy.runtime.placeholderDatabaseUrlTitle,
      message: apiCopy.runtime.placeholderDatabaseUrlMessage,
      steps: [...apiCopy.runtime.placeholderDatabaseUrlSteps],
      diagnostics
    });
  }

  const sessionSecret = process.env.SESSION_SECRET?.trim();
  if (!sessionSecret) {
    return setupPayload({
      code: 'MISSING_SESSION_SECRET',
      title: apiCopy.runtime.missingSessionSecretTitle,
      message: apiCopy.runtime.missingSessionSecretMessage,
      steps: [...apiCopy.runtime.missingSessionSecretSteps],
      diagnostics
    });
  }

  try {
    const usersCount = await prisma.user.count({
      where: {
        email: {
          not: null
        }
      }
    });

    const warnings = isPlaceholder(sessionSecret, SESSION_SECRET_PLACEHOLDERS)
      ? [apiCopy.runtime.placeholderSecretWarning]
      : undefined;

    return {
      mode: usersCount > 0 ? 'login' : 'register',
      hasUsers: usersCount > 0,
      warnings
    };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return setupPayload({
        code: 'DATABASE_UNREACHABLE',
        title: apiCopy.runtime.dbUnreachableTitle,
        message: databaseSetupMessage(),
        steps: [...apiCopy.runtime.dbUnreachableSteps],
        diagnostics
      });
    }

    return setupPayload({
      code: 'RUNTIME_ERROR',
      title: apiCopy.runtime.runtimeErrorTitle,
      message: apiCopy.runtime.runtimeErrorMessage,
      steps: [...apiCopy.runtime.runtimeErrorSteps],
      diagnostics
    });
  }
}
