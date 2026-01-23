// src/data/events/apiEventsRepo.ts
import type { EventsRepo } from "./eventsRepo";
import type { ID } from "../../types/domain";
import { eventsMock } from "../../mock/events";
import { getAppConfig } from "../../config/appConfig";

/**
 * Repo API (stub)
 * - Hoy: retorna mock (para no romper nada)
 * - Mañana: aquí conectas Supabase/REST
 */
export const apiEventsRepo: EventsRepo = {
  async listEvents() {
    const cfg = getAppConfig();
    void cfg;
    return eventsMock;
  },

  async getEventById(id: ID) {
    return eventsMock.find((e) => e.id === id) ?? null;
  },
};
