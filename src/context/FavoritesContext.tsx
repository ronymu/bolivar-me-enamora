import React, { createContext, useContext, useMemo } from "react";
import { usePersistedState } from "../hooks/usePersistedState";

type FavoritesContextValue = {
  favoriteIds: string[];
  addFavorite: (eventId: string) => void;
  removeFavorite: (eventId: string) => void;
  isFavorite: (eventId: string) => boolean;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  // Persistencia MVP: mantiene favoritos al cerrar / abrir la app.
  const { value: favoriteIds, setValue: setFavoriteIds } =
    usePersistedState<string[]>("favorites:eventIds", []);

  const addFavorite = (eventId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(eventId) ? prev : [eventId, ...prev]
    );
  };

  const removeFavorite = (eventId: string) => {
    setFavoriteIds((prev) => prev.filter((id) => id !== eventId));
  };

  const clearFavorites = () => setFavoriteIds([]);

  const isFavorite = (eventId: string) => favoriteIds.includes(eventId);

  const value = useMemo(
    () => ({ favoriteIds, addFavorite, removeFavorite, isFavorite, clearFavorites }),
    [favoriteIds]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
