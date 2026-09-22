type CacheEntry = { value: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function isMutation(method?: string): boolean {
  const m = (method || "GET").toUpperCase();
  return m !== "GET" && m !== "HEAD";
}

function cacheKey(method: string | undefined, url: string): string {
  return `${(method || "GET").toUpperCase()} ${url}`;
}

function ttlFor(path: string): number {
  if (path.includes("/auth/me")) return 3000;
  if (path.includes("/students/profile")) return 10000;
  if (path.includes("/elections")) return 15000;
  if (path.includes("/candidates")) return 15000;
  if (path.includes("/announcements")) return 15000;
  if (path.includes("/notifications")) return 5000;
  return 5000;
}

export function invalidateAll(): void {
  store.clear();
}

export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.includes(prefix)) store.delete(key);
  }
}

/**
 * Memoized fetch for GET-style reads. Dedupes concurrent identical calls and
 * serves repeat reads from memory within a short TTL while a page is alive.
 * handleResponse receives the raw Response and is responsible for errors —
 * failed responses are never cached.
 */
export async function cachedFetch<T>(
  url: string,
  init: RequestInit,
  handleResponse: (res: Response) => Promise<T>
): Promise<T> {
  const key = cacheKey(init.method, url);
  const mutating = isMutation(init.method);

  if (!mutating) {
    const hit = store.get(key);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.value as T;
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const p = (async () => {
    try {
      const res = await fetch(url, init);
      const value = await handleResponse(res);
      if (!mutating && res.ok) {
        store.set(key, { value, expiresAt: Date.now() + ttlFor(url) });
      }
      if (mutating) {
        invalidateAll();
      }
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  if (!mutating) {
    inflight.set(key, p);
  }

  return p;
}