// src/utils/imageUtils.ts

/**
 * Genera una URL optimizada para Supabase.
 * Asegura que la URL de pre-carga y la de renderizado sean IDÉNTICAS byte a byte.
 */
export const getOptimizedImageUrl = (url: string | null | undefined, width = 800): string | null => {
  if (!url) return null;
  if (typeof url !== 'string') return url;

  // Si no es Supabase, devolver original
  if (!url.includes('supabase')) return url;
  
  // Si ya tiene parámetros de transformación (ej. ya tiene ?width=...), no tocamos
  if (url.includes('transform=') || url.includes('width=')) return url;

  // Lógica robusta de tu amigo para detectar si usar ? o &
  const separator = url.includes('?') ? '&' : '?';

  // Calidad dinámica: 
  // Si es miniatura (<=100px) -> calidad 10 (borrosa, ultraligera)
  // Si es imagen normal -> calidad 80 (nítida)
  const quality = width <= 100 ? 10 : 80;

  // Usamos el transformador estándar.
  // IMPORTANTE: Siempre pediremos formato 'webp' para Android/iOS
  return `${url}${separator}transform=w_${width}&q=${quality}&f=webp`;
};