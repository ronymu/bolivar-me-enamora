import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/navigation/AppNavigator";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { EventsProvider } from "./src/context/EventsContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <EventsProvider>
        <FavoritesProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </FavoritesProvider>
      </EventsProvider>
    </SafeAreaProvider>
  );
}
