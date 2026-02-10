// src/navigation/AppNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navTypes";

import LoginScreen from "../screens/citizen/auth/LoginScreen";
import SignupScreen from "../screens/citizen/auth/SignupScreen";
import ForgotPasswordScreen from "../screens/citizen/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/citizen/auth/ResetPasswordScreen";

import DiscoverScreen from "../screens/citizen/DiscoverScreen";
import EventDetailScreen from "../screens/citizen/EventDetailScreen";
import MyEventsScreen from "../screens/citizen/MyEventsScreen";
import NotificationsScreen from "../screens/citizen/NotificationsScreen";
import ProfileScreen from "../screens/citizen/ProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Discover">
      {/* ✅ APP (Zona Pública / Mixta) */}
      <Stack.Screen name="Discover" component={DiscoverScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />

      {/* ✅ AUTH (Accesible desde Profile) */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Iniciar sesión" }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Crear cuenta" }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: "Recuperar contraseña" }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: "Nueva contraseña" }}
      />
    </Stack.Navigator>
  );
}
