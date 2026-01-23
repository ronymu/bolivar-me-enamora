// src/config/appConfig.ts
import Constants from "expo-constants";

export type EventsSource = "mock" | "api";

type ExtraConfig = {
  EVENTS_SOURCE?: EventsSource;

  // (futuro) Supabase / API
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  API_BASE_URL?: string;
};

export type AppConfig = {
  eventsSource: EventsSource;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
};

export function getAppConfig(): AppConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

  return {
    eventsSource: extra.EVENTS_SOURCE ?? "mock",
    supabaseUrl: extra.SUPABASE_URL,
    supabaseAnonKey: extra.SUPABASE_ANON_KEY,
    apiBaseUrl: extra.API_BASE_URL,
  };
}
