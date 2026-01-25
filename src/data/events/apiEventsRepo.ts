// src/data/events/apiEventsRepo.ts
import type { EventsRepo } from "./eventsRepo";
import type { ID, Event } from "../../types/domain";
import { getSupabase } from "../../lib/supabaseClient";
import { adaptEventFromDb } from "../../adapters/eventAdapter";

// Ajusta este select según tus columnas reales.
// Si pides una columna inexistente, Supabase puede devolver error.
const SELECT_DISCOVER = `
  id,
  title,
  description,
  full_description,
  start_at,
  end_at,
  city,
  address,
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

function toSupabaseError(context: string, error: any) {
  const msg = error?.message ? String(error.message) : "Unknown error";
  const code = error?.code ? ` (${error.code})` : "";
  return new Error(`[Supabase] ${context}${code}: ${msg}`);
}

export const apiEventsRepo: EventsRepo = {
  async listEvents(): Promise<Event[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("events")
      .select(SELECT_DISCOVER)
      .eq("status", "published")
      .order("start_at", { ascending: true, nullsFirst: false });

    if (error) throw toSupabaseError("listEvents", error);

    return (data ?? []).map(adaptEventFromDb);
  },

  async getEventById(id: ID): Promise<Event | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("events")
      .select(SELECT_DISCOVER)
      .eq("id", id)
      .maybeSingle();

    if (error) throw toSupabaseError("getEventById", error);

    return data ? adaptEventFromDb(data) : null;
  },
};
