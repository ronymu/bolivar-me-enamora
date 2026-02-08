import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import AppNavigator from "./src/navigation/AppNavigator";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { EventsProvider } from "./src/context/EventsContext";
import { AuthProvider } from "./src/context/AuthContext";

const linking = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      // Auth
      Login: "login",
      Signup: "signup",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",

      // App
      Discover: "discover",
      EventDetail: "event/:eventId",
      MyEvents: "my-events",
      Notifications: "notifications",
      Profile: "profile",
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EventsProvider>
          <FavoritesProvider>
            <NavigationContainer linking={linking}>
              <AppNavigator />
            </NavigationContainer>
          </FavoritesProvider>
        </EventsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
