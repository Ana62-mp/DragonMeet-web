export type DataMode = 'demo' | 'supabase';

/** The cloud mode is prepared (see supabase/schema.sql) but not enabled: the demo always runs. */
export function describeDataMode(env: Record<string, string | undefined>): { requested: DataMode; active: 'demo'; notice: string | null } {
  const requested: DataMode = env.VITE_DATA_MODE === 'supabase' ? 'supabase' : 'demo';
  if (requested === 'demo') return { requested, active: 'demo', notice: null };
  const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const notice = configured
    ? 'Modo nube preparado, aún no habilitado en esta versión: se usa el modo demo.'
    : 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY: se usa el modo demo.';
  return { requested, active: 'demo', notice };
}
