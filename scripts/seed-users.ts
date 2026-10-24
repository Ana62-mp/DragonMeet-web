/** Creates the prototype's Supabase Auth users (profiles are created by the database trigger).
 * LOCAL ONLY: needs the service role key from .env.local; never import this from the frontend.
 * Run: npm run seed:users
 */
import { createClient } from '@supabase/supabase-js';
import { people } from './seed-data.ts';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local`);
  return value;
};

const supabase = createClient(required('VITE_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const passwords = Object.fromEntries(
  ['SEED_PASSWORD_ANA', 'SEED_PASSWORD_VALE', 'SEED_PASSWORD_PAULO', 'SEED_PASSWORD_FILLER'].map(name => [name, required(name)]),
);

const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const byEmail = new Map(existing.users.map(u => [u.email, u.id]));

for (const p of people) {
  const metadata = {
    full_name: p.fullName, first_name: p.firstName, banner_code: p.banner, career: p.career,
    semester: p.semester, avatar_color: p.color,
  };
  const id = byEmail.get(p.email);
  const { error } = id
    ? await supabase.auth.admin.updateUserById(id, { password: passwords[p.passwordEnv], user_metadata: metadata })
    : await supabase.auth.admin.createUser({ email: p.email, password: passwords[p.passwordEnv], email_confirm: true, user_metadata: metadata });
  console.log(`${error ? 'ERROR' : id ? 'actualizado' : 'creado   '} ${p.email}${error ? ` — ${error.message}` : ''}`);
  if (error) process.exitCode = 1;
}
console.log('\nSiguiente paso: ejecuta supabase/seed.sql en el SQL Editor de Supabase.');
