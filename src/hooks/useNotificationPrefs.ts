// src/hooks/useNotificationPrefs.ts
import { useEffect, useState } from "react";

/**
 * MVP store global en memoria (sin AsyncStorage todavía).
 * - Compartido entre pantallas sin Provider.
 * - Backend-ready: luego se conecta a user_preferences (Supabase) o AsyncStorage.
 */

type Listener = () => void;

let _remindersEnabled = true;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function useNotificationPrefs() {
  const [remindersEnabled, setLocal] = useState<boolean>(_remindersEnabled);

  useEffect(() => {
    const listener = () => setLocal(_remindersEnabled);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setRemindersEnabled = (value: boolean) => {
    _remindersEnabled = value;
    emit();
  };

  return { remindersEnabled, setRemindersEnabled };
}
