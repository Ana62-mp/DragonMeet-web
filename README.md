# DragonMeet USFQ · Web Demo

**Match your time. Find your people.**

Prototipo académico web responsive para comparar horarios en el campus Cumbayá. **No es una app oficial ni se conecta con USFQ** (sin Microsoft 365, Banner, GPS ni IA real). Todos los estudiantes, horarios y zonas son ficticios.

## Ejecutar

Requisitos: Node.js 22+ y npm.

```bash
npm install
npm run dev      # demo local, no necesita .env ni servicios externos
npm run test     # motor de coincidencias, permisos, disponibilidad y validaciones
npm run build
```

## Funcionalidades

- Demo con 5 estudiantes ficticios (Ana, Vale, Paulo, Sofía, Diego); cambia de perspectiva en **Perfil > Herramientas demo**.
- **Horario** lunes–viernes 07:00–20:00 con selector de hora tipo rueda (minutos exactos), solo edificios académicos y validación de solapamientos.
- **Privacidad por clase** (Perfil): `Materia y horario` o `Solo bloques ocupados`. Tú siempre ves tus clases completas; un amigo autorizado puede ver tu horario desde el selector de **Mi horario**.
- **Importar foto (demo IA)**: simulación determinista; no analiza ni envía la imagen. Se revisa y edita antes de guardar.
- **Estoy en campus** (Mapa y Perfil) independiente de *Compartir mi zona*; la presencia manual expira a las 4 h.
- **Amigos sin clases y en campus ahora** en Inicio (hora de Ecuador). Para probar otro día/hora usa la simulación en Herramientas demo; el reloj real no cambia. «Sin clases» no significa tiempo libre personal.
- **Dragon Map**: SVG ilustrativo original (no es GPS ni plano oficial) con zonas clicables y teclado.
- Motor Match con cortes exactos al minuto para 2–5 participantes.

## Estructura

```text
src/main.tsx          pantallas y rutas
src/store.ts          estado Zustand (persistido en localStorage)
src/engine.ts         cálculo de coincidencias
src/domain/           time, schedule (validación), permissions (visibilidad), availability
src/data/             catálogos de edificios/zonas y fixture de la foto demo
src/components/       Avatar, TimeWheelPicker, ClassFormModal, SchedulePhotoDemo,
                      AvailableFriendsPanel, CampusSvgMap
src/lib/              useClock, dataMode
src/services/         scheduleMapping (horas decimales ⇄ minutos para PostgreSQL)
supabase/             schema.sql, seed_demo.sql
```

## Conectar Supabase (fase 2, opcional)

Estado actual: **`VITE_DATA_MODE=demo`**. El esquema y las funciones están listos; el cliente cloud **aún no está implementado** y, si se pide `supabase`, la app avisa y sigue en demo.

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor (RLS activo, nada legible por `anon`).
2. En *Authentication* crea cinco usuarios de prueba (contraseñas que elijas tú; no van en SQL ni en el repo) y ejecuta `supabase/seed_demo.sql` (ajusta los correos si usas otros).
3. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. **Nunca** uses `service_role` en el frontend.
4. Falta escribir el adaptador cliente: lecturas de datos ajenos **solo** con las RPC `get_friend_schedule`, `get_visible_friend_zones` y `get_friends_on_campus_now`, que filtran en el servidor (ocultar texto en React no protege una respuesta de API). Hay que probar las políticas con las cinco cuentas antes de activar el modo.

## Aviso

Mapa ilustrativo de referencia · No es ubicación GPS ni plano oficial interactivo. La lista de edificios es de referencia y debe validarse con la universidad.
