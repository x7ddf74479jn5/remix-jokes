import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const db: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  fetch: (...args) => fetch(...args),
});
