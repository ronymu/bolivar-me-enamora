/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.
 * Útil para determinar la proximidad de los eventos al usuario.
 */
export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Retorna la distancia en kilómetros
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Formatea la distancia para mostrarla en la UI de forma amigable.
 */
export function formatDistance(km: number | undefined | null): string {
  if (km == null) return "Distancia desconocida";
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `A ${meters} m de ti`;
  }
  return `A ${km.toFixed(1)} km de ti`;
}