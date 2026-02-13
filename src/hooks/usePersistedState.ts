// src/hooks/usePersistedState.ts
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Updater<T> = T | ((prev: T) => T);

export function usePersistedState<T>(key: string, defaultValue: T) {
  const safeKey = typeof key === "string" && key.trim().length > 0 ? key : null;

  const [value, _setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  const isMounted = useRef(true);
  const valueRef = useRef<T>(defaultValue);

  // escritura serializada (última gana)
  const writeSeq = useRef(0);
  const writeInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isMounted.current = true;

    (async () => {
      try {
        if (!safeKey) {
          if (isMounted.current) setIsLoaded(true);
          return;
        }

        const raw = await AsyncStorage.getItem(safeKey);
        if (raw != null) {
          const parsed = JSON.parse(raw) as T;
          if (isMounted.current) {
            valueRef.current = parsed;
            _setValue(parsed);
          }
        }
      } catch (e) {
        console.warn(`[usePersistedState] load failed for "${key}"`, e);
      } finally {
        if (isMounted.current) setIsLoaded(true);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, [safeKey, key]);

  const setValue = useCallback(
    (next: Updater<T>) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(valueRef.current)
          : next;

      valueRef.current = resolved;
      _setValue(resolved);

      if (!safeKey) return;

      const mySeq = ++writeSeq.current;

      // si hay una escritura en vuelo, encadenamos
      const run = async () => {
        try {
          // si alguien llamó setValue otra vez, esta escritura queda vieja y no debe pisar
          if (mySeq !== writeSeq.current) return;
          await AsyncStorage.setItem(safeKey, JSON.stringify(resolved));
        } catch (e) {
          console.warn(`[usePersistedState] save failed for "${key}"`, e);
        }
      };

      writeInFlight.current = (writeInFlight.current ?? Promise.resolve()).then(run);
    },
    [safeKey, key]
  );

  return { value, setValue, isLoaded } as const;
}
