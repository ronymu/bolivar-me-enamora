// src/hooks/usePersistedState.ts
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Updater<T> = T | ((prev: T) => T);

/**
 * Persisted state minimalista (MVP)
 * - Carga 1 vez al montar
 * - Guarda cada vez que cambia
 * - Evita setState si el componente se desmonta
 * - Soporta updater funcional (evita bugs al encadenar setState)
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, _setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  const isMounted = useRef(true);
  const valueRef = useRef<T>(defaultValue);

  // Mantener ref alineada con el valor actual.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isMounted.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) {
          const parsed = JSON.parse(raw) as T;
          if (isMounted.current) {
            valueRef.current = parsed;
            _setValue(parsed);
          }
        }
      } catch (e) {
        // No rompemos UX por storage; log suave.
        console.warn(`[usePersistedState] load failed for "${key}"`, e);
      } finally {
        if (isMounted.current) setIsLoaded(true);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, [key]);

  const setValue = useCallback(
    async (next: Updater<T>) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(valueRef.current)
          : next;

      valueRef.current = resolved;
      _setValue(resolved);

      try {
        await AsyncStorage.setItem(key, JSON.stringify(resolved));
      } catch (e) {
        console.warn(`[usePersistedState] save failed for "${key}"`, e);
      }
    },
    [key]
  );

  return { value, setValue, isLoaded } as const;
}
