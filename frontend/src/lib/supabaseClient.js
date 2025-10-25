import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase URL or anon key is missing. Authentication is disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
