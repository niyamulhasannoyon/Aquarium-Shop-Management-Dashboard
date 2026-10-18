import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
};
