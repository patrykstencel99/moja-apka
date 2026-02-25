export const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING'
] as const;

export type DatabaseUrlSource = (typeof DATABASE_URL_KEYS)[number];

export const DATABASE_URL_PLACEHOLDERS = ['USER:PASSWORD@HOST', 'postgresql://USER', 'HOST:5432'];

export function resolveDatabaseUrl(): { url: string | null; source: DatabaseUrlSource | null } {
  for (const key of DATABASE_URL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return { url: value, source: key };
    }
  }

  return { url: null, source: null };
}

export function isPlaceholderDatabaseUrl(value: string): boolean {
  return DATABASE_URL_PLACEHOLDERS.some((pattern) => value.includes(pattern));
}
