// src/data/events/apiEventsRepo.ts
import type { EventsRepo } from "./eventsRepo";
import type { ID, Event } from "../../types/domain";
import { getSupabase } from "../../lib/supabaseClient";
import { adaptEventFromDb } from "../../adapters/eventAdapter";
import { hydrateEventMediaRow } from "../../lib/mediaSigner";

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

// TTL recomendado para móvil: 1 hora
const SIGN_TTL_SECONDS = 60 * 60;

// Si end_at viene null, asumimos duración por defecto para anti-zombie
const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000; // 4h
const ZOMBIE_GRACE_MS = 0;

function parseMs(v: any): number | null {
  if (!v) return null;
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : null;
}

function isZombie(row: any, nowMs: number) {
  const startMs = parseMs(row?.start_at);
  const endMs = parseMs(row?.end_at);

  if (!startMs && !endMs) return false;

  const effectiveEnd = endMs ?? (startMs ? startMs + DEFAULT_DURATION_MS : null);
  if (!effectiveEnd) return false;

  return effectiveEnd + ZOMBIE_GRACE_MS < nowMs;
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

    const nowMs = Date.now();
    let rows = (data ?? []) as any[];

    // ✅ Anti-zombie (filtra antes de firmar, ahorra trabajo)
    rows = rows.filter((r) => !isZombie(r, nowMs));

    const hydrated = await Promise.all(
      rows.map((row) => hydrateEventMediaRow(row, SIGN_TTL_SECONDS))
    );

    if (__DEV__) {
      const first = (hydrated ?? [])[0] as any;
      console.log("[LIST] count:", hydrated?.length ?? 0);
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

    const hydrated = await hydrateEventMediaRow(data, SIGN_TTL_SECONDS);

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
