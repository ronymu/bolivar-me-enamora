// src/navigation/navTypes.ts
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Discover: undefined;
  MyEvents: undefined;
  EventDetail: { eventId: string };
  Profile: undefined;
  Notifications: undefined;
};

export type RootNav<T extends keyof RootStackParamList> = NativeStackNavigationProp<
  RootStackParamList,
  T
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
