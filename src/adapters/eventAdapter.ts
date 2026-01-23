// src/adapters/eventAdapter.ts
import type { Event, MediaSource, Organizer } from "../types/domain";

export function getEventImages(event: Event): MediaSource[] {
  const imgs = event.images?.filter(Boolean) ?? [];
  if (imgs.length > 0) return imgs;
  return event.image ? [event.image] : [];
}

export function getOrganizer(
  event: Event
): Required<Pick<Organizer, "name">> & Organizer {
  return {
    name: event.organizer?.name ?? "Gestor cultural",
    ...event.organizer,
  };
}

export function getMapAddress(event: Event): string {
  // Preferimos una address explícita si existe.
  return event.location?.address ?? event.locationLabel ?? "Dirección no disponible";
}

export function getMapCoords(event: Event): { latitude?: number; longitude?: number } {
  return {
    latitude: event.location?.latitude,
    longitude: event.location?.longitude,
  };
}
