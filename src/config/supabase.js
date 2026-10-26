import { createClient } from '@supabase/supabase-js';

// Este cliente se usa solo desde el navegador y solo acepta la clave
// publicable. La clave secreta se queda en server/supabaseMedia.js.
const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
).trim();

export const supabaseConfigured = Boolean(url && publishableKey);

export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_BUCKET || "app-images";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export { bucket };
