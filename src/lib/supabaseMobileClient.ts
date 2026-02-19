// src/lib/supabaseMobileClient.ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { SupportedStorage } from "@supabase/gotrue-js";
// Constants ya no es necesario para las claves, se leen desde process.env

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// DEBUG: Log para verificar que las variables de entorno se están cargando.
console.log("[Supabase Init] URL loaded:", url.substring(0, 20) + '...');
console.log("[Supabase Init] Anon Key loaded:", anon.substring(0, 10) + '...');

    
if (!url || !anon) {
  throw new Error(
    "Faltan variables de entorno: EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. Asegúrate de tener un archivo .env."
  );
}

const ExpoSecureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabaseMobile = createClient(url, anon, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
