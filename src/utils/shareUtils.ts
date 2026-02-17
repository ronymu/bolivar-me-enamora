// src/utils/shareUtils.ts
import { Share, Platform } from "react-native";
import type { Event } from "../types/domain";

/**
 * Dispara el menú nativo para compartir un evento.
 * Usa el scheme "bolivar-me-enamora://" configurado en App.tsx
 */
export async function shareEvent(event: Event) {
  try {
    // Generamos la URL profunda (Deep Link)
    const url = `bolivar-me-enamora://event/${event.id}`;
    
    // El mensaje cambia ligeramente según el sistema para que se vea mejor
    const message = Platform.select({
      ios: `¡Mira este evento en Bolívar Me Enamora!: ${event.title}`,
      android: `¡Mira este evento en Bolívar Me Enamora!: ${event.title}\n\n${url}`,
    });

    const result = await Share.share({
      title: event.title,
      message: message || "",
      url: url, // En iOS esto es vital para que aparezca el link bonito
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // compartido con éxito en una app específica
      } else {
        // compartido con éxito
      }
    } else if (result.action === Share.dismissedAction) {
      // el usuario cerró el menú sin compartir
    }
  } catch (error) {
    console.error("Error al compartir evento:", error);
  }
}