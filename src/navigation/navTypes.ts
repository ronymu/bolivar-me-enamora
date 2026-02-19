// src/navigation/navTypes.ts
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;

  // App
  Discover: undefined;
  EventDetail: { eventId: string };
  MyEvents: undefined;
  Notifications: undefined;
  Profile: undefined;
  EditProfile: undefined; // ✅ Añadido para la gestión de identidad
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;