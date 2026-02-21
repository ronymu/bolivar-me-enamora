// src/utils/imageUtils.ts

/**
 * Genera una URL optimizada para Supabase.
 * Asegura que la URL de pre-carga y la de renderizado sean IDÉNTICAS byte a byte.
 */
export const getOptimizedImageUrl = (url: string | null | undefined, width = 800): string | null => {
  if (!url || typeof url !== 'string') return url;

  // Si no es Supabase, devolver original
  // Se hace más específico para evitar falsos positivos con otras URLs
  if (!url.includes('supabase.co')) return url;
  
  // Si ya tiene parámetros de transformación (ej. ya tiene ?width=...), no tocamos
  if (url.includes('transform=') || url.includes('width=')) return url;

  // Lógica para detectar si usar ? o &
  const separator = url.includes('?') ? '&' : '?';

  // Calidad dinámica: 
  // Usamos valores estándar: 75 para calidad web buena, 20 para miniaturas muy ligeras.
  const quality = width <= 100 ? 20 : 75;

  // Usamos los parámetros de transformación estándar de Supabase para mayor claridad.
  // IMPORTANTE: Siempre pediremos formato 'webp' para Android/iOS
  return `${url}${separator}width=${width}&quality=${quality}&format=webp`;
};