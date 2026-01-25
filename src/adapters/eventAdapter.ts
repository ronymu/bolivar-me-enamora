// src/adapters/eventAdapter.ts
import type { Event, MediaSource, Organizer, Location } from "../types/domain";

/**
 * 1x1 transparente (data URI) para evitar { uri: "" } que genera warnings / glitches.
 */
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function toMediaSource(urlOrNull: unknown): MediaSource {
  // MediaSource soporta require(...) o { uri }
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
 * Adapter Supabase row -> Event (modelo UI actual).
 * Espera campos típicos:
 * - id, title, description, full_description
 * - city, address, category
 * - start_at (ISO string)
 * - thumbnail_url / cover_image_url
 * - image_urls (array de urls)
 * - is_free, price_amount, currency
 * - ticket_url
 */
export function adaptEventFromDb(row: any): Event {
  const title = safeText(row?.title) || "Evento";
  const description = safeText(row?.description);

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

  const images = (imageUrls.length ? imageUrls : cover ? [cover] : []).map((u) =>
    toMediaSource(u)
  );

  const location: Location | undefined =
    city || address || row?.latitude != null || row?.longitude != null
      ? {
          city: city || undefined,
          address: address || undefined,
          latitude: row?.latitude == null ? undefined : Number(row.latitude),
          longitude: row?.longitude == null ? undefined : Number(row.longitude),
        }
      : undefined;

  const fullDescription = safeText(row?.full_description) || description;

  return {
    id: String(row?.id ?? ""),
    title,
    description,
    fullDescription: fullDescription || "Descripción no disponible",
    locationLabel,
    dateLabel,
    priceLabel: formatPriceLabel(row),
    chips,
    image,
    images,
    location,
    ticketUrl: safeText(row?.ticket_url) || undefined,
  };
}

/* ====== Helpers existentes (no rompen nada) ====== */

export function getEventImages(event: Event): MediaSource[] {
  const imgs = event.images?.filter(Boolean) ?? [];
  if (imgs.length > 0) return imgs;
  return event.image ? [event.image] : [];
}

export function getOrganizer(
  event: Event
): Required<Pick<Organizer, "name">> & Organizer {
  const org = event.organizer ?? ({} as Organizer);
  return {
    ...org,
    name: org.name ?? "Gestor cultural",
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
