// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/navigation/AppNavigator";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { EventsProvider } from "./src/context/EventsContext";
import { AuthProvider } from "./src/context/AuthContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EventsProvider>
          <FavoritesProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </FavoritesProvider>
        </EventsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
