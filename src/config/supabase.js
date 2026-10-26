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
