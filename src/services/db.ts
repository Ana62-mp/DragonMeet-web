import { supabase } from '../lib/supabase';

/** Turns a Supabase `{ data, error }` result into a value or a thrown Error with a readable message. */
export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/** Calls a database function and types its result (the client has no generated schema types). */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
