// src/data/events/mockEventsRepo.ts
import type { EventsRepo } from "./eventsRepo";
import { eventsMock } from "../../mock/events";
import type { ID } from "../../types/domain";

export const mockEventsRepo: EventsRepo = {
  async listEvents() {
    // En mock retornamos directo.
    // Si mañana quieres simular red: await new Promise(r => setTimeout(r, 300));
    return eventsMock;
  },

  async getEventById(id: ID) {
    return eventsMock.find((e) => e.id === id) ?? null;
  },
};
