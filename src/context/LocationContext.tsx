import React, { createContext, useContext, useState, useEffect } from "react";
import * as Location from "expo-location";

interface LocationContextState {
  latitude: number | null;
  longitude: number | null;
  isLocationLoading: boolean;
  locationError: string | null;
}

const LocationContext = createContext<LocationContextState>({
  latitude: null,
  longitude: null,
  isLocationLoading: true,
  locationError: null,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== "granted") {
          if (isMounted) setLocationError("Permiso de ubicación denegado.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setLatitude(location.coords.latitude);
          setLongitude(location.coords.longitude);
        }
      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
        if (isMounted) setLocationError("No se pudo obtener la ubicación actual.");
      } finally {
        if (isMounted) setIsLocationLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <LocationContext.Provider
      value={{ latitude, longitude, isLocationLoading, locationError }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export function useLocation() {
  return useContext(LocationContext);
}