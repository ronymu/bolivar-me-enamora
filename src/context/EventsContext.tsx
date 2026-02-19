// src/context/EventsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Event, ID } from "../types/domain";
import type { EventsRepo } from "../data/events/eventsRepo";
import { mockEventsRepo } from "../data/events/mockEventsRepo";
import { apiEventsRepo } from "../data/events/apiEventsRepo";
import { getAppConfig } from "../config/appConfig";

type EventsState = {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getById: (id: ID) => Event | undefined;

  /**
   * ✅ Hidrata un evento desde backend (Detail)
   * - Hace getEventById en repo (puede traer organizer join)
   * - Lo guarda/actualiza en el cache local (events[])
   */
  hydrateById: (id: ID) => Promise<Event | null>;
};

const EventsContext = createContext<EventsState | null>(null);

type Props = {
  children: React.ReactNode;
  repoOverride?: EventsRepo;
};

function pickRepo(): EventsRepo {
  const cfg = getAppConfig();

  if (cfg.eventsSource === "api") return apiEventsRepo;
  return mockEventsRepo;
}

export function EventsProvider({ children, repoOverride }: Props) {
  const repo = repoOverride ?? pickRepo();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await repo.listEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar los eventos.");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback(
    (id: ID) => events.find((e) => e.id === id),
    [events]
  );

  const hydrateById = useCallback(
    async (id: ID) => {
      try {
        const full = await repo.getEventById(id);
        if (!full) return null;

        setEvents((prev) => {
          const idx = prev.findIndex((e) => e.id === id);
          if (idx === -1) return [full, ...prev];

          // ✅ Merge suave: lo “full” gana, pero no pierdes nada raro que ya estuviera.
          const next = [...prev];
          next[idx] = { ...next[idx], ...full };
          return next;
        });

        return full;
      } catch (e) {
        // No rompemos UX del detalle si falla; solo devolvemos null.
        console.warn("[EventsContext] hydrateById failed:", e);
        return null;
      }
    },
    [repo]
  );

  const value = useMemo(
    () => ({ events, isLoading, error, refresh, getById, hydrateById }),
    [events, isLoading, error, refresh, getById, hydrateById]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within an EventsProvider");
  return ctx;
}
