// src/lib/mediaSigner.ts
import { getSupabase } from "./supabaseClient";

type CacheEntry = {
  url: string;
  // epoch ms
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function nowMs() {
  return Date.now();
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test((s ?? "").trim());
}

function normalizeMaybePath(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const v = s.trim();
  if (!v) return null;
  return v; // puede ser http o path; lo decidimos después
}

/**
 * Si faltan menos de X ms para expirar, lo consideramos “stale” y re-firmamos.
 */
const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 min

async function signOnePath(path: string, ttlSeconds: number): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from("events").createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "createSignedUrl failed");
  }

  return data.signedUrl;
}

async function signWithCache(path: string, ttlSeconds: number, staleMs = DEFAULT_STALE_MS) {
  const cached = cache.get(path);
  if (cached) {
    const remaining = cached.expiresAt - nowMs();
    if (remaining > staleMs) return cached.url;
  }

  const signedUrl = await signOnePath(path, ttlSeconds);
  // guardamos expiración aproximada (TTL exacto)
  cache.set(path, { url: signedUrl, expiresAt: nowMs() + ttlSeconds * 1000 });
  return signedUrl;
}

/**
 * Pool simple para limitar concurrencia (evita “picos” con galerías grandes).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length) as any;
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return out;
}

export async function resolveSignedUrl(
  pathOrUrl: unknown,
  ttlSeconds: number,
  opts?: { staleMs?: number; retryOnce?: boolean }
): Promise<string | null> {
  const v = normalizeMaybePath(pathOrUrl);
  if (!v) return null;

  // Si ya es URL (legacy o ya firmada), no tocamos.
  if (isHttpUrl(v)) return v;

  try {
    return await signWithCache(v, ttlSeconds, opts?.staleMs ?? DEFAULT_STALE_MS);
  } catch (e) {
    // reintento 1 vez (por flakiness de red)
    if (opts?.retryOnce) {
      try {
        // limpiamos cache por si estaba corrupta
        cache.delete(v);
        return await signWithCache(v, ttlSeconds, opts?.staleMs ?? DEFAULT_STALE_MS);
      } catch {
        return v; // devolvemos path para debug
      }
    }
    return v; // devolvemos path para debug
  }
}

export async function resolveSignedUrls(
  pathsOrUrls: unknown[],
  ttlSeconds: number,
  opts?: { concurrency?: number; staleMs?: number; retryOnce?: boolean }
): Promise<string[]> {
  const clean = (pathsOrUrls ?? [])
    .map(normalizeMaybePath)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  if (!clean.length) return [];

  const concurrency = opts?.concurrency ?? 6;

  return mapWithConcurrency(clean, concurrency, async (v) => {
    // http se devuelve tal cual, path se firma con cache
    if (isHttpUrl(v)) return v;

    const url = await resolveSignedUrl(v, ttlSeconds, {
      staleMs: opts?.staleMs,
      retryOnce: opts?.retryOnce ?? true,
    });

    return url ?? v;
  });
}

/**
 * Helper para “hidratar” una fila de events:
 * - cover_image_url
 * - thumbnail_url
 * - image_urls[]
 */
export async function hydrateEventMediaRow(row: any, ttlSeconds: number) {
  const [cover, thumb, gallery] = await Promise.all([
    resolveSignedUrl(row?.cover_image_url, ttlSeconds, { retryOnce: true }),
    resolveSignedUrl(row?.thumbnail_url, ttlSeconds, { retryOnce: true }),
    resolveSignedUrls(Array.isArray(row?.image_urls) ? row.image_urls : [], ttlSeconds, {
      concurrency: 6,
      retryOnce: true,
    }),
  ]);

  return {
    ...row,
    cover_image_url: cover ?? null,
    thumbnail_url: thumb ?? null,
    image_urls: gallery,
  };
}
