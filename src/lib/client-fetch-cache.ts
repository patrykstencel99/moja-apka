'use client';

type CacheEntry<T> = {
  expiresAt: number;
  value: FetchJsonResult<T>;
};

export type FetchJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
};

type FetchJsonCachedOptions = {
  ttlMs?: number;
  bust?: boolean;
  init?: RequestInit;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<FetchJsonResult<unknown>>>();

function cacheKey(url: string, init?: RequestInit) {
  const method = init?.method?.toUpperCase() ?? 'GET';
  return `${method}:${url}`;
}

function fromMemoryCache<T>(key: string): FetchJsonResult<T> | null {
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!hit) {
    return null;
  }

  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return hit.value;
}

function saveToMemoryCache<T>(key: string, result: FetchJsonResult<T>, ttlMs: number) {
  memoryCache.set(key, {
    expiresAt: Date.now() + Math.max(250, ttlMs),
    value: result
  });
}

export function invalidateClientFetchCache(matcher?: string | RegExp) {
  if (!matcher) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (typeof matcher === 'string') {
      if (key.includes(matcher)) {
        memoryCache.delete(key);
      }
      continue;
    }

    if (matcher.test(key)) {
      memoryCache.delete(key);
    }
  }
}

export async function fetchJsonCached<T>(url: string, options: FetchJsonCachedOptions = {}): Promise<FetchJsonResult<T>> {
  const ttlMs = options.ttlMs ?? 12_000;
  const key = cacheKey(url, options.init);

  if (options.bust) {
    memoryCache.delete(key);
  } else {
    const cached = fromMemoryCache<T>(key);
    if (cached) {
      return cached;
    }
  }

  const inflightHit = inflight.get(key) as Promise<FetchJsonResult<T>> | undefined;
  if (inflightHit) {
    return inflightHit;
  }

  const task = (async () => {
    const response = await fetch(url, options.init);
    const data = (await response.json().catch(() => null)) as T | null;
    const result: FetchJsonResult<T> = {
      ok: response.ok,
      status: response.status,
      data
    };

    if (response.ok) {
      saveToMemoryCache(key, result, ttlMs);
    }

    return result;
  })();

  inflight.set(key, task as Promise<FetchJsonResult<unknown>>);

  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}
