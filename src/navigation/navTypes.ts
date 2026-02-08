// src/navigation/navTypes.ts
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;

  Discover: undefined;
  EventDetail: { eventId: string };
  MyEvents: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
