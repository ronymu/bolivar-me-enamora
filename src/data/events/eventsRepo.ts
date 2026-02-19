// src/data/events/eventsRepo.ts
import type { Event, ID } from "../../types/domain";

/**
 * Contrato de acceso a datos de eventos.
 * Hoy: mock
 * Mañana: Supabase / REST
 */
export type EventsRepo = {
  listEvents: () => Promise<Event[]>;
  getEventById: (id: ID) => Promise<Event | null>;
};
