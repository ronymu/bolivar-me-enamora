// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAppConfig } from "../config/appConfig";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const cfg = getAppConfig();
  const url = (cfg.supabaseUrl ?? "").trim();
  const anon = (cfg.supabaseAnonKey ?? "").trim();

  if (!url || !anon) {
    throw new Error(
      "Supabase no configurado: revisa app.json -> expo.extra SUPABASE_URL y SUPABASE_ANON_KEY y reinicia con: npx expo start -c"
    );
  }

  _client = createClient(url, anon, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return _client;
}
