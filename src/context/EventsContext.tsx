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
import { useLocation } from "./LocationContext";
import { formatDistance, getDistanceInKm } from "../utils/geoUtils";

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

  /**
   * ✅ Hidrata múltiples eventos en una sola llamada desde backend
   */
  hydrateByIds: (ids: ID[]) => Promise<Event[]>;
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
  
  const { latitude, longitude } = useLocation();

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

  const sortedEvents = useMemo(() => {
    if (latitude == null || longitude == null || events.length === 0) {
      return events;
    }

    const enriched = events.map((e) => {
      const lat = e.location?.latitude;
      const lon = e.location?.longitude;
      let distanceKm: number | undefined;
      let distanceLabel = "Distancia desconocida";

      if (lat != null && lon != null) {
        distanceKm = getDistanceInKm(latitude, longitude, lat, lon);
        distanceLabel = formatDistance(distanceKm);
      }

      return { ...e, distanceKm, distanceLabel };
    });

    return enriched.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [events, latitude, longitude]);

  const getById = useCallback(
    (id: ID) => sortedEvents.find((e) => e.id === id),
    [sortedEvents]
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

  const hydrateByIds = useCallback(
    async (ids: ID[]) => {
      if (!ids || ids.length === 0) return [];
      try {
        // ⚠️ Requiere que implementes listEventsByIds en tu EventsRepo
        const fullEvents = await (repo as any).listEventsByIds(ids);
        if (!fullEvents || fullEvents.length === 0) return [];

        setEvents((prev) => {
          const next = [...prev];
          fullEvents.forEach((fullEvent: Event) => {
            const idx = next.findIndex((e) => e.id === fullEvent.id);
            if (idx === -1) {
              next.push(fullEvent);
            } else {
              // ✅ Merge suave
              next[idx] = { ...next[idx], ...fullEvent };
            }
          });
          return next;
        });

        return fullEvents;
      } catch (e) {
        console.warn("[EventsContext] hydrateByIds failed:", e);
        return [];
      }
    },
    [repo]
  );

  const value = useMemo(
    () => ({ events: sortedEvents, isLoading, error, refresh, getById, hydrateById, hydrateByIds }),
    [sortedEvents, isLoading, error, refresh, getById, hydrateById, hydrateByIds]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within an EventsProvider");
  return ctx;
}
