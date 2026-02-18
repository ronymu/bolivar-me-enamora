// src/lib/mediaSigner.ts
import { supabaseMobile } from "./supabaseMobileClient";

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
  return v; 
}

/**
 * Si faltan menos de X ms para expirar, lo consideramos “stale” y re-firmamos.
 */
const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 min

async function signOnePath(path: string, ttlSeconds: number, bucket: string): Promise<string> {
  const supabase = supabaseMobile;
  // ✅ Ahora dinámico según el bucket pasado
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? `createSignedUrl failed for bucket: ${bucket}`);
  }

  return data.signedUrl;
}

async function signWithCache(path: string, ttlSeconds: number, bucket: string, staleMs = DEFAULT_STALE_MS) {
  // ✅ El cache key ahora incluye el bucket para evitar colisiones si hay paths iguales en distintos buckets
  const cacheKey = `${bucket}:${path}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    const remaining = cached.expiresAt - nowMs();
    if (remaining > staleMs) return cached.url;
  }

  const signedUrl = await signOnePath(path, ttlSeconds, bucket);
  cache.set(cacheKey, { url: signedUrl, expiresAt: nowMs() + ttlSeconds * 1000 });
  return signedUrl;
}

/**
 * Pool simple para limitar concurrencia
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
  opts?: { staleMs?: number; retryOnce?: boolean; bucket?: string } // ✅ Bucket opcional
): Promise<string | null> {
  const v = normalizeMaybePath(pathOrUrl);
  if (!v) return null;

  if (isHttpUrl(v)) return v;

  const targetBucket = opts?.bucket ?? "events"; // Default a "events"

  try {
    return await signWithCache(v, ttlSeconds, targetBucket, opts?.staleMs ?? DEFAULT_STALE_MS);
  } catch (e) {
    if (opts?.retryOnce) {
      try {
        cache.delete(`${targetBucket}:${v}`);
        return await signWithCache(v, ttlSeconds, targetBucket, opts?.staleMs ?? DEFAULT_STALE_MS);
      } catch {
        return v; 
      }
    }
    return v; 
  }
}

export async function resolveSignedUrls(
  pathsOrUrls: unknown[],
  ttlSeconds: number,
  opts?: { concurrency?: number; staleMs?: number; retryOnce?: boolean; bucket?: string } // ✅ Bucket opcional
): Promise<string[]> {
  const clean = (pathsOrUrls ?? [])
    .map(normalizeMaybePath)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  if (!clean.length) return [];

  const concurrency = opts?.concurrency ?? 6;
  const targetBucket = opts?.bucket ?? "events";

  return mapWithConcurrency(clean, concurrency, async (v) => {
    if (isHttpUrl(v)) return v;

    const url = await resolveSignedUrl(v, ttlSeconds, {
      staleMs: opts?.staleMs,
      retryOnce: opts?.retryOnce ?? true,
      bucket: targetBucket,
    });

    return url ?? v;
  });
}

/**
 * Helper para “hidratar” una fila de events
 */
export async function hydrateEventMediaRow(row: any, ttlSeconds: number) {
  // Para eventos forzamos bucket "events" explícitamente por seguridad
  const [cover, thumb, gallery] = await Promise.all([
    resolveSignedUrl(row?.cover_image_url, ttlSeconds, { retryOnce: true, bucket: "events" }),
    resolveSignedUrl(row?.thumbnail_url, ttlSeconds, { retryOnce: true, bucket: "events" }),
    resolveSignedUrls(Array.isArray(row?.image_urls) ? row.image_urls : [], ttlSeconds, {
      concurrency: 6,
      retryOnce: true,
      bucket: "events",
    }),
  ]);

  return {
    ...row,
    cover_image_url: cover ?? null,
    thumbnail_url: thumb ?? null,
    image_urls: gallery,
  };
}