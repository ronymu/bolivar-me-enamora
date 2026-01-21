import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/navigation/AppNavigator";
import { FavoritesProvider } from "./src/context/FavoritesContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <FavoritesProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}
