import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase env vars missing:", { SUPABASE_URL, SUPABASE_KEY });
}

export const supabase = createClient(
  SUPABASE_URL || "https://fjuwgqenztbpdphfppmi.supabase.co",
  SUPABASE_KEY || "sb_publishable_KI5y33P41fTOkxPpyJ0alg_iUmvp4Ra"
);
