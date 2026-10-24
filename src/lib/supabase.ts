import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** The anon/publishable key is safe in the browser only because every table has RLS. Never use the service role here. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// createClient throws on empty values; the setup screen is shown instead when not configured.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true },
});
