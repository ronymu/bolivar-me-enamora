// src/data/events/apiEventsRepo.ts
import type { EventsRepo } from "./eventsRepo";
import type { ID, Event } from "../../types/domain";
import { getSupabase } from "../../lib/supabaseClient";
import { adaptEventFromDb } from "../../adapters/eventAdapter";

/**
 * Lista (Discover / listados)
 * - No necesitamos embed del organizer aquí (solo Detail)
 */
const SELECT_LIST = `
  id,
  organizer_id,
  organizer_profile_id,
  title,
  description,
  full_description,
  start_at,
  end_at,
  city,
  address,
  lat,
  lng,
  place_name,
  location_note,
  category,
  status,
  ticket_url,
  cover_image_url,
  thumbnail_url,
  image_urls,
  is_free,
  price_amount,
  currency,
  price_note
`;

/**
 * Detalle (EventDetail)
 * ✅ Embed del organizer desde profiles por FK correcta:
 *    events.organizer_profile_id -> profiles.id
 */
const SELECT_DETAIL = `
  id,
  organizer_id,
  organizer_profile_id,
  title,
  description,
  full_description,
  start_at,
  end_at,
  city,
  address,
  lat,
  lng,
  place_name,
  location_note,
  category,
  status,
  ticket_url,
  cover_image_url,
  thumbnail_url,
  image_urls,
  is_free,
  price_amount,
  currency,
  price_note,
  organizer:profiles!events_organizer_profile_id_fkey(
    id,
    display_name,
    full_name,
    organization_name,
    avatar_url,
    is_verified
  )
`;

function toSupabaseError(context: string, error: any) {
  const msg = error?.message ? String(error.message) : "Unknown error";
  const code = error?.code ? ` (${error.code})` : "";
  return new Error(`[Supabase] ${context}${code}: ${msg}`);
}

/** -----------------------------
 * Media helpers (paths -> signed URLs)
 * ------------------------------ */

// legacy: URL pública completa vieja / URL normal
function isHttpUrl(s: string) {
  return /^https?:\/\//i.test((s ?? "").trim());
}

// Si te llegan URLs signed (por error), igual las dejamos pasar (son http)
function normalizeMaybePath(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const v = s.trim();
  if (!v) return null;

  // Si ya es URL, se devuelve tal cual
  if (isHttpUrl(v)) return v;

  // Si es path correcto (events/<eventId>/...), lo devolvemos
  return v;
}

async function signedUrlFor(pathOrUrl: string, ttlSeconds: number): Promise<string> {
  const v = (pathOrUrl ?? "").trim();
  if (!v) return v;

  // Si ya es URL (legacy), no firmamos
  if (isHttpUrl(v)) return v;

  const supabase = getSupabase();

  // Firmamos usando bucket privado "events"
  const { data, error } = await supabase.storage.from("events").createSignedUrl(v, ttlSeconds);

  // Si falla por lo que sea, devolvemos el mismo string (para debug)
  if (error || !data?.signedUrl) {
    if (__DEV__) {
      console.log("[signedUrlFor] failed for path:", v, "error:", error?.message);
    }
    return v;
  }

  return data.signedUrl;
}

async function hydrateMediaUrls(row: any, ttlSeconds: number) {
  // cover / thumb
  const coverRaw = normalizeMaybePath(row?.cover_image_url);
  const thumbRaw = normalizeMaybePath(row?.thumbnail_url);

  // Galería
  const galleryRaw: string[] = Array.isArray(row?.image_urls)
    ? row.image_urls
        .map(normalizeMaybePath)
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  // Firma (en paralelo)
  const [coverSigned, thumbSigned, gallerySigned] = await Promise.all([
    coverRaw ? signedUrlFor(coverRaw, ttlSeconds) : Promise.resolve(null),
    thumbRaw ? signedUrlFor(thumbRaw, ttlSeconds) : Promise.resolve(null),
    Promise.all(galleryRaw.map((p) => signedUrlFor(p, ttlSeconds))),
  ]);

  // Mutamos una copia segura (no tocar row original por si supabase lo congela)
  return {
    ...row,
    cover_image_url: coverSigned ?? row?.cover_image_url ?? null,
    thumbnail_url: thumbSigned ?? row?.thumbnail_url ?? null,
    image_urls: gallerySigned,
  };
}

export const apiEventsRepo: EventsRepo = {
  async listEvents(): Promise<Event[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("events")
      .select(SELECT_LIST)
      .eq("status", "published")
      .order("start_at", { ascending: true, nullsFirst: false });

    if (error) throw toSupabaseError("listEvents", error);

    // TTL recomendado para móvil: 1 hora
    const ttl = 60 * 60;

    const hydrated = await Promise.all((data ?? []).map((row) => hydrateMediaUrls(row, ttl)));

    if (__DEV__) {
      const first = (hydrated ?? [])[0] as any;
      console.log("[LIST] first cover:", first?.cover_image_url);
      console.log("[LIST] first thumb:", first?.thumbnail_url);
      console.log("[LIST] first image_urls:", first?.image_urls);
    }

    return hydrated.map(adaptEventFromDb);
  },

  async getEventById(id: ID): Promise<Event | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("events")
      .select(SELECT_DETAIL)
      .eq("id", id)
      .maybeSingle();

    if (error) throw toSupabaseError("getEventById", error);
    if (!data) return null;

    // TTL recomendado para detalle: 1 hora
    const ttl = 60 * 60;

    const hydrated = await hydrateMediaUrls(data, ttl);

    if (__DEV__) {
      console.log("[DETAIL] organizer_profile_id:", (hydrated as any)?.organizer_profile_id);
      console.log("[DETAIL] organizer embed:", (hydrated as any)?.organizer);
      console.log("[DETAIL] cover:", (hydrated as any)?.cover_image_url);
      console.log("[DETAIL] thumb:", (hydrated as any)?.thumbnail_url);
      console.log("[DETAIL] image_urls:", (hydrated as any)?.image_urls);
    }

    return adaptEventFromDb(hydrated);
  },
};
