// src/hooks/useSeenEvents.ts
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Base
const BASE_KEY = "seen_events_v1";
const MAX_SEEN = 2000;

function safeParse(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => String(x ?? "").trim())
      .filter((x) => x.length > 0);
  } catch {
    return [];
  }
}

function uniqKeepOrder(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const k = String(id ?? "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

// ✅ CAMBIO: hook por usuario (guest comparte memoria de invitados)
export function useSeenEvents(userId: string = "guest") {
  const cleanUser = String(userId ?? "guest").trim() || "guest";
  const storageKey = `${BASE_KEY}_${cleanUser}`;

  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const writeInFlightRef = useRef<Promise<void> | null>(null);

  // ✅ Cargar memoria cuando cambia userId
  useEffect(() => {
    let alive = true;
    setIsLoaded(false);

    (async () => {
      try {
        const json = await AsyncStorage.getItem(storageKey);
        if (!alive) return;
        setSeenIds(uniqKeepOrder(safeParse(json)));
      } finally {
        if (alive) setIsLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [storageKey]);

  const persist = useCallback(async (next: string[]) => {
    const payload = JSON.stringify(next);

    if (writeInFlightRef.current) return writeInFlightRef.current;

    const p = AsyncStorage.setItem(storageKey, payload)
      .catch(() => {})
      .finally(() => {
        writeInFlightRef.current = null;
      });

    writeInFlightRef.current = p;
    return p;
  }, [storageKey]);

  const markAsSeen = useCallback(
    (id: string) => {
      const clean = String(id ?? "").trim();
      if (!clean) return;

      setSeenIds((prev) => {
        if (prev.includes(clean)) return prev;

        let next = uniqKeepOrder([...prev, clean]);
        if (next.length > MAX_SEEN) next = next.slice(next.length - MAX_SEEN);

        // Guardar sin bloquear UI
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearSeen = useCallback(() => {
    setSeenIds([]);
    AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  return { seenIds, isLoaded, markAsSeen, clearSeen };
}
