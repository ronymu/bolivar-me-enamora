// src/context/FavoritesContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePersistedState } from "../hooks/usePersistedState";
import { supabaseMobile } from "../lib/supabaseMobileClient";

type FavoritesStore = Record<string, string[]>; // { [userId | "__anon__"]: eventIds[] }

type FavoritesContextValue = {
  favoriteIds: string[];
  addFavorite: (eventId: string) => void;
  removeFavorite: (eventId: string) => void;
  isFavorite: (eventId: string) => boolean;
  clearFavorites: () => void;

  syncing: boolean;
  lastSyncError: string | null;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const ANON_KEY = "__anon__";

function uniqKeepOrder(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const k = String(id || "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  // Persistimos por usuario dentro de un solo objeto
  const { value: store, setValue: setStore } = usePersistedState<FavoritesStore>("favorites:byUser", {});

  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const syncInFlightRef = useRef<Promise<void> | null>(null);

  const userKey = session?.user?.id ?? ANON_KEY;
  const favoriteIds = useMemo(() => {
    const ids = store?.[userKey] ?? [];
    return uniqKeepOrder(ids);
  }, [store, userKey]);

  // helper para escribir en el store del usuario actual
  const setFavoriteIdsForUser = (next: string[] | ((prev: string[]) => string[])) => {
    setStore((prevStore) => {
      const base = prevStore ?? {};
      const prevIds = base[userKey] ?? [];
      const computed = typeof next === "function" ? (next as any)(prevIds) : next;
      return { ...base, [userKey]: uniqKeepOrder(computed) };
    });
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabaseMobile.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
    }

    init();

    const { data: sub } = supabaseMobile.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function loadFavoritesFromServer(userId: string): Promise<string[]> {
    const { data, error } = await supabaseMobile
      .from("favorites")
      .select("event_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const ids = (data ?? [])
      .map((r: any) => String(r?.event_id ?? "").trim())
      .filter((x: string) => x.length > 0);

    return uniqKeepOrder(ids);
  }

  async function upsertFavoritesToServer(userId: string, ids: string[]) {
    if (!ids.length) return;
    const rows = ids.map((eventId) => ({ user_id: userId, event_id: eventId }));
    const { error } = await supabaseMobile
      .from("favorites")
      .upsert(rows, { onConflict: "user_id,event_id" });

    if (error) throw new Error(error.message);
  }

  async function syncFromServer() {
    const userId = session?.user?.id;
    if (!userId) return; // si es anon, no sync

    // Deduplicar llamadas simultáneas
    if (syncInFlightRef.current) return syncInFlightRef.current;

    const p = (async () => {
      setSyncing(true);
      setLastSyncError(null);

      try {
        const serverIds = await loadFavoritesFromServer(userId);

        // Importante: solo mergeamos con el cache DEL MISMO usuario.
        const localIds = (store?.[userId] ?? []);
        const merged = uniqKeepOrder([...serverIds, ...localIds]);

        // 1) Pintar merged local
        setStore((prev) => ({ ...(prev ?? {}), [userId]: merged }));

        // 2) Si local tenía extras, subirlos al server
        const extras = merged.filter((id) => !serverIds.includes(id));
        if (extras.length) {
          await upsertFavoritesToServer(userId, extras);
        }
      } catch (e: any) {
        setLastSyncError(e?.message ?? "No se pudieron sincronizar favoritos.");
      } finally {
        setSyncing(false);
        syncInFlightRef.current = null;
      }
    })();

    syncInFlightRef.current = p;
    return p;
  }

  // Sync automático cuando cambie el usuario logueado
  useEffect(() => {
    if (!session?.user?.id) return;
    syncFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const addFavorite = (eventId: string) => {
    const id = String(eventId || "").trim();
    if (!id) return;

    // Optimista local
    setFavoriteIdsForUser((prev) => (prev.includes(id) ? prev : [id, ...prev]));

    const userId = session?.user?.id;
    if (!userId) return;

    supabaseMobile
      .from("favorites")
      .upsert([{ user_id: userId, event_id: id }], { onConflict: "user_id,event_id" })
      .then(({ error }) => {
        if (error) {
          console.warn("[Favorites] addFavorite sync failed:", error.message);
          setLastSyncError(error.message);
        }
      })
      .catch((e) => {
        console.warn("[Favorites] addFavorite sync failed:", e);
        setLastSyncError(String(e?.message ?? e));
      });
  };

  const removeFavorite = (eventId: string) => {
    const id = String(eventId || "").trim();
    if (!id) return;

    // Optimista local
    setFavoriteIdsForUser((prev) => prev.filter((x) => x !== id));

    const userId = session?.user?.id;
    if (!userId) return;

    supabaseMobile
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", id)
      .then(({ error }) => {
        if (error) {
          console.warn("[Favorites] removeFavorite sync failed:", error.message);
          setLastSyncError(error.message);

          // rollback suave
          setFavoriteIdsForUser((prev) => (prev.includes(id) ? prev : [id, ...prev]));
        }
      })
      .catch((e) => {
        console.warn("[Favorites] removeFavorite sync failed:", e);
        setLastSyncError(String(e?.message ?? e));

        // rollback suave
        setFavoriteIdsForUser((prev) => (prev.includes(id) ? prev : [id, ...prev]));
      });
  };

  const clearFavorites = () => {
    // Clear solo del usuario actual
    setFavoriteIdsForUser([]);

    const userId = session?.user?.id;
    if (!userId) return;

    supabaseMobile
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          console.warn("[Favorites] clearFavorites sync failed:", error.message);
          setLastSyncError(error.message);
        }
      })
      .catch((e) => {
        console.warn("[Favorites] clearFavorites sync failed:", e);
        setLastSyncError(String(e?.message ?? e));
      });
  };

  const isFavorite = (eventId: string) => favoriteIds.includes(eventId);

  const value = useMemo(
    () => ({
      favoriteIds,
      addFavorite,
      removeFavorite,
      isFavorite,
      clearFavorites,
      syncing,
      lastSyncError,
    }),
    [favoriteIds, syncing, lastSyncError]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
