// src/adapters/eventAdapter.ts
import type { Event, MediaSource, Organizer, Location } from "../types/domain";

/**
 * 1x1 transparente para evitar { uri: "" } que genera warnings/glitches.
 */
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function toMediaSource(urlOrNull: unknown): MediaSource {
  if (!urlOrNull) return { uri: TRANSPARENT_1PX };

  if (typeof urlOrNull === "string") {
    const uri = urlOrNull.trim();
    return { uri: uri.length ? uri : TRANSPARENT_1PX };
  }

  const maybeObj = urlOrNull as any;
  if (maybeObj?.uri && typeof maybeObj.uri === "string") {
    const uri = maybeObj.uri.trim();
    return { uri: uri.length ? uri : TRANSPARENT_1PX };
  }

  return { uri: String(urlOrNull) };
}

function safeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function formatDateLabel(startAt: unknown): string {
  const raw = safeText(startAt);
  if (!raw) return "Fecha por confirmar";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Fecha por confirmar";

  try {
    return d.toLocaleString("es-CO", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

function formatPriceLabel(row: any): string {
  if (row?.is_free) return "Gratis";

  const amount = row?.price_amount;
  const currency = safeText(row?.currency) || "COP";
  if (amount == null) return "Precio";

  const n = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(n)) return "Precio";

  return `$${n} ${currency}`;
}

/**
 * Acepta organizer embed como:
 * - objeto { display_name, organization_name, ... }
 * - array [ { ... } ]
 * - o bajo otros nombres (por si cambias alias)
 */
function pickOrganizerEmbed(row: any): any | null {
  const raw =
    row?.organizer ??
    row?.profiles ??
    row?.profile ??
    row?.organizer_profile ??
    null;

  // If no embedded object is found, but we have the ID, it means the query is incomplete.
  // This is a good place to warn the developer.
  if (!raw && (row?.organizer_profile_id || row?.organizer_id)) {
    console.warn(
      `[ADAPTER] Event ${
        row.id
      }: Found organizer ID but the profile object is not embedded. Check the '.select()' query to ensure it includes the organizer's profile data (e.g., 'organizer:profiles!organizer_profile_id(*)').`
    );
  }

  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function adaptOrganizerFromProfiles(row: any): Organizer | undefined {
  const p = pickOrganizerEmbed(row);
  if (!p) return undefined;
  
    const fullName = safeText(p.full_name);
    const displayName = safeText(p.display_name);
    const organizationName = safeText(p.organization_name);
    const avatarUrl = safeText(p.avatar_url);
    const phone = safeText(p.phone);
  
    // Per request: prioritize full_name, then display_name, with 'Organizador' as fallback.
    const name = fullName || displayName || "Organizador";
  
    return {
      id: p.id ? String(p.id) : undefined,
      name: name,
      full_name: fullName || undefined,
      avatar_url: avatarUrl || undefined,
      organization_name: organizationName || undefined,
      phone: phone || undefined,
      organization: organizationName || undefined, // Keep for compatibility
    };
  }

export function adaptEventFromDb(row: any): Event {
  const title = safeText(row?.title) || "Evento";
  const description = safeText(row?.description);
  const fullDescription = safeText(row?.full_description) || description || "Descripción no disponible";

  const city = safeText(row?.city);
  const address = safeText(row?.address);
  const category = safeText(row?.category);

  const locationLabel =
    [address, city].filter(Boolean).join(", ") ||
    city ||
    address ||
    "Ubicación por confirmar";

  const dateLabel = formatDateLabel(row?.start_at);

  const chips: string[] = [];
  if (category) chips.push(category);
  if (city) chips.push(city);

  const cover = safeText(row?.thumbnail_url) || safeText(row?.cover_image_url);
  const image = toMediaSource(cover);

  const imageUrls: string[] = Array.isArray(row?.image_urls)
    ? row.image_urls.filter((x: any) => typeof x === "string" && x.trim().length > 0)
    : [];

  const images = (imageUrls.length ? imageUrls : cover ? [cover] : []).map(toMediaSource);

  const lat =
    toNumberOrUndefined(row?.lat) ??
    toNumberOrUndefined(row?.latitude) ??
    toNumberOrUndefined(row?.location_lat);

  const lng =
    toNumberOrUndefined(row?.lng) ??
    toNumberOrUndefined(row?.longitude) ??
    toNumberOrUndefined(row?.location_lng);

  const location: Location | undefined =
    city || address || lat != null || lng != null
      ? {
          city: city || undefined,
          address: address || undefined,
          latitude: lat,
          longitude: lng,
        }
      : undefined;

  const organizer = adaptOrganizerFromProfiles(row);

  return {
    id: String(row?.id ?? ""),
    title,
    description,
    fullDescription,
    locationLabel,
    dateLabel,
    priceLabel: formatPriceLabel(row),
    chips,
    image,
    images,
    location,
    ticketUrl: safeText(row?.ticket_url) || undefined,
    organizer,
  };
}

/* ===== Helpers que ya usas en UI ===== */

export function getEventImages(event: Event): MediaSource[] {
  const imgs = event.images?.filter(Boolean) ?? [];
  if (imgs.length > 0) return imgs;
  return event.image ? [event.image] : [];
}

export function getOrganizer(
  event: Event | null | undefined
): Organizer {
  return {
    name: event?.organizer?.name ?? "Gestor cultural",
    ...event?.organizer,
  };
}

export function getMapAddress(event: Event): string {
  return event.location?.address ?? event.locationLabel ?? "Dirección no disponible";
}

export function getMapCoords(event: Event): { latitude?: number; longitude?: number } {
  return {
    latitude: event.location?.latitude,
    longitude: event.location?.longitude,
  };
}
