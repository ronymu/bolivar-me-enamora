import { createClient } from '@supabase/supabase-js';

// Accede a las variables de entorno con el prefijo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Inicializa y exporta el cliente de Supabase para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);