// src/types/domain.ts
import type { ImageSourcePropType } from "react-native";

export type ID = string;

/**
 * Para este MVP, soportamos:
 * - assets locales: require(...) -> number
 * - URLs remotas: { uri: string }
 */
export type MediaSource = ImageSourcePropType;

export type Location = {
  city?: string;
  region?: string;
  country?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export type Organizer = {
  id?: ID;
  name: string;
  organization?: string;
  full_name?: string;
  avatar_url?: string;
  organization_name?: string;
  phone?: string;
};

/**
 * Modelo único de evento (backend-ready)
 *
 * Nota: seguimos manteniendo dateLabel/priceLabel porque hoy la UI los consume.
 * Cuando conectemos backend, podemos migrar a startAt ISO y formatear en un formatter.
 */
export type Event = {
  id: ID;

  title: string;
  description: string;
  fullDescription: string;

  // UI (MVP)
  locationLabel: string; // e.g. "Centro Histórico, Cartagena"
  dateLabel: string; // e.g. "Hoy • 5:00 PM"
  priceLabel: string; // e.g. "$25.000 COP" | "Gratis"
  chips: string[];

  // Media
  image: MediaSource; // principal (Discover)
  images?: MediaSource[]; // carrusel (Detail)

  // Backend-ready (opcionales)
  organizer?: Organizer;
  location?: Location;
  ticketUrl?: string;
};
