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
};

const EventsContext = createContext<EventsState | null>(null);

type Props = {
  children: React.ReactNode;

  /**
   * Override manual (tests / experiments).
   * Normalmente NO lo uses: usa EVENTS_SOURCE en app.json
   */
  repoOverride?: EventsRepo;
};

function pickRepo(): EventsRepo {
  const cfg = getAppConfig();

  // ✅ Logs diagnósticos (temporal)
  console.log("[CONFIG]", {
    eventsSource: cfg.eventsSource,
    hasUrl: !!cfg.supabaseUrl,
    hasAnonKey: !!cfg.supabaseAnonKey,
    urlPreview: cfg.supabaseUrl ? String(cfg.supabaseUrl).slice(0, 28) + "…" : null,
    keyPreview: cfg.supabaseAnonKey ? String(cfg.supabaseAnonKey).slice(0, 12) + "…" : null,
  });

  if (cfg.eventsSource === "api") {
    console.log("[EVENTS] using apiEventsRepo");
    return apiEventsRepo;
  }

  console.log("[EVENTS] using mockEventsRepo");
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
      console.log("[EVENTS] refresh() start");
      const data = await repo.listEvents();
      console.log("[EVENTS] loaded:", Array.isArray(data) ? data.length : "not-array");
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.log("[EVENTS] error:", e);
      setError(e?.message ?? "No se pudieron cargar los eventos.");
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

  const value = useMemo(
    () => ({ events, isLoading, error, refresh, getById }),
    [events, isLoading, error, refresh, getById]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within an EventsProvider");
  return ctx;
}
