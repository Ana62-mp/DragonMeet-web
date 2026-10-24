# DragonMeet USFQ

**Match your time. Find your people.**

Prototipo académico web (mobile-first) para encontrar ventanas libres en común entre amigos universitarios del campus Cumbayá. **No es una app oficial de USFQ**: no usa Microsoft 365, Banner, GPS ni IA real. Los datos de las cuentas de prueba son ficticios.

## Stack

React 18 · TypeScript · Vite · React Router · Zustand · Tailwind (base) + CSS propio · Lucide · **Supabase** (Auth + PostgreSQL con RLS).

## Estructura

```text
src/pages/        Login, Dashboard, Schedule, Friends, Match, CampusMap, Profile
src/components/   Layout, ui (Badge, Toggle, Segmented, Skeleton, Toaster…), TimeWheelPicker, CampusSvgMap…
src/hooks/        useFriends, useSchedule, useDebounce
src/services/     profiles, schedule, friends, invites (único lugar que habla con Supabase)
src/store.ts      estado en memoria cargado desde Supabase (sin datos quemados)
src/domain/       reglas puras: tiempo, validación de clases, disponibilidad
supabase/         migrations/001_schema.sql, seed.sql (generado)
scripts/          seed-data.ts, seed-users.ts, build-seed-sql.ts
```

## Puesta en marcha

1. **Crear el proyecto** en [supabase.com](https://supabase.com) (plan gratuito).
2. **Auth:** *Authentication › Providers › Email*: deja activo el correo/contraseña y **desactiva «Allow new users to sign up»** (las cuentas las crea el script).
3. **Migración:** abre *SQL Editor*, pega `supabase/migrations/001_schema.sql` y ejecútalo.
4. **Variables:** copia `.env.example` a `.env.local` y rellena (nunca se sube al repo):
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (*Project Settings › API*).
   - `SUPABASE_SERVICE_ROLE_KEY` (solo para el seed, **nunca** con prefijo `VITE_`).
   - `SEED_PASSWORD_ANA`, `SEED_PASSWORD_VALE`, `SEED_PASSWORD_PAULO`, `SEED_PASSWORD_FILLER` (las eliges tú).
5. **Cuentas:** `npm install` y luego `npm run seed:users` (crea 17 usuarios de Auth; el perfil lo crea un trigger).
6. **Datos de ejemplo:** pega `supabase/seed.sql` en el SQL Editor (horarios, amistades, permisos y zonas). Si cambias `scripts/seed-data.ts`, regenera con `npm run seed:sql`. Las zonas de presencia caducan a las 4 h: vuelve a ejecutar `seed.sql` para refrescarlas.
7. **Local:** `npm run dev`.

## Cuentas de prueba

| Persona | Correo | Contraseña |
|---|---|---|
| Ana Paula Moposita | pmoposita@estud.usfq.edu.ec | `SEED_PASSWORD_ANA` |
| Valentina Paredes | vparedes1@estud.usfq.edu.ec | `SEED_PASSWORD_VALE` |
| Paulo Pérez | pperez@estud.usfq.edu.ec | `SEED_PASSWORD_PAULO` |
| 14 estudiantes de relleno | ver `scripts/seed-data.ts` | `SEED_PASSWORD_FILLER` |

Historia de la demo: Ana ↔ Vale y Ana ↔ Paulo son amigos con horario y zona compartidos; Vale → Paulo es una solicitud pendiente (acéptala desde Paulo); Sebastián y Emilia tienen solicitudes pendientes hacia Ana; Camila comparte solo «bloques ocupados»; Isabella es amiga pero Ana no le comparte nada. Los códigos Banner `0099xxxx` son ficticios.

## Seguridad

- RLS en todas las tablas; `anon` no tiene acceso a nada.
- Cada estudiante solo lee y edita sus propias filas. `email`, `banner_code` e `id` no se pueden modificar desde el cliente.
- Perfiles, horarios y zona de otras personas **solo salen por funciones del servidor** (`search_users`, `list_connections`, `get_visible_schedules`, `get_visible_friend_zones`, `get_friend_access`) que exigen amistad aceptada y permiso de **ambos** lados; con «Solo bloques ocupados» el servidor ni siquiera envía nombre ni edificio. Código y aula nunca salen.
- Eliminar un amigo borra la amistad y los permisos en ambos sentidos y cancela los encuentros compartidos.
- No se guardan coordenadas ni historial de movimientos: solo la última zona general, que caduca a las 4 h.
- La clave `anon` es pública por diseño; la `service_role` solo vive en `.env.local`.

## Pruebas y calidad

```bash
npm run test    # motor, reglas de dominio, datos del seed y 12 pruebas de RLS contra Postgres real (PGlite)
npm run lint
npm run build
```

Las pruebas SQL ejecutan la migración y el `seed.sql` reales en un Postgres en memoria y verifican aislamiento, enmascarado, revocación y restricciones.

## Despliegue en Vercel

1. Sube el repo a GitHub e impórtalo en Vercel (preset *Vite*; build `npm run build`, salida `dist`).
2. En *Settings › Environment Variables* añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (solo esas dos).
3. `vercel.json` ya incluye el rewrite para que las rutas de la SPA funcionen al recargar.
4. En Supabase, *Authentication › URL Configuration*: añade la URL de Vercel como *Site URL*.

## Decisiones

- Zonas: se mantiene el catálogo de 13 zonas del plano (edificios y espacios abiertos) en la tabla `campus_zones`, en lugar del enum inicial con Student Union/Hall, que no se pudo verificar en el plano. Los espacios abiertos se pueden elegir como ubicación pero no como edificio de clase.
- Se conservan: rueda horaria, «Solo bloques ocupados», «Estoy en campus», importar foto (demo, sin IA real) y simulación de hora para probar «Ahora en campus».
- Mapa ilustrativo de referencia · No es ubicación GPS ni plano oficial interactivo.
