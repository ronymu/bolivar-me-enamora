// src/lib/supabaseMobileClient.ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

type Extra = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const url = (extra.SUPABASE_URL ?? "").trim();
const anon = (extra.SUPABASE_ANON_KEY ?? "").trim();

if (!url || !anon) {
  throw new Error(
    "Faltan keys en app.json (expo.extra): SUPABASE_URL y SUPABASE_ANON_KEY"
  );
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabaseMobile = createClient(url, anon, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
