// src/config/appConfig.ts
import Constants from "expo-constants";

export type EventsSource = "mock" | "api";

type ExtraConfig = {
  EVENTS_SOURCE?: EventsSource;
  API_BASE_URL?: string;
};

export type AppConfig = {
  eventsSource: EventsSource;
  apiBaseUrl?: string;
};

export function getAppConfig(): AppConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

  return {
    eventsSource: extra.EVENTS_SOURCE ?? "mock",
    apiBaseUrl: extra.API_BASE_URL,
  };
}
