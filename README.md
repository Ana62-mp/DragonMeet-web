# Dragon Match USFQ · Web Demo V1

**Match your time. Find your people.**

Frontend web responsivo para demostrar una red social de coincidencias de horarios en el campus Cumbayá. **No es una app nativa**. El proyecto utiliza estudiantes, horarios y zonas ficticios; no integra servicios reales de USFQ.

## Ejecutar

Requisitos: Node.js 20.19+ o 22+ y npm.

```bash
npm install
npm run dev
```

Visita la URL local indicada por Vite. Para comprobar el motor de coincidencias: `npm run test` (Node.js 22+). Para build: `npm run build`. Para vista previa de producción: `npm run preview`.

## Tecnologías

React, TypeScript, Vite, React Router v6, Zustand, CSS responsivo y Tailwind CSS configurado, Lucide React. Los controles están construidos como componentes propios; shadcn/ui queda pendiente para integración posterior.

## Funcionalidades demo

- Login demo como Ana; Microsoft 365 es un botón deshabilitado hasta contar con credenciales y autorizaciones oficiales.
- Dashboard basado en los horarios y la hora del campus.
- Calendario lunes-viernes 07:00–20:00, alta/edición/baja de clases y validación de solapamientos.
- Red social de amistad con solicitudes recibidas/enviadas y revocación.
- Motor de coincidencias dinámico de 15 minutos para 2–5 participantes con agregación de franjas. Verde todos libres, amarillo al menos dos libres pero no todos, rojo menos de dos libres.
- Invitaciones con respuestas individuales, cancelación y fecha de calendario.
- SVG conceptual de nueve zonas de campus, presencia manual, permisos globales e individuales.
- Simulación multiusuario para comprobar consentimientos bilaterales y respuestas.
- Persistencia local con reinicio de demo.

## Privacidad y limitaciones

**localStorage no es seguridad real**: todo el dataset está en el navegador y puede inspeccionarse. Los controles de autorización se aplican en el motor y a las vistas de demostración; una plataforma real necesita backend y autorización de servidor, políticas RLS y permisos institucionales. No hay rastreo GPS ni historia de zonas. No almacena credenciales.

No hay conexión a Banner, Brightspace o Entra ID. Se verificaron 5 pruebas unitarias del motor de coincidencias con Node.js 22. La meta de rendimiento de 50 ms aún requiere benchmark de navegador. El diseño del mapa es esquemático, no una representación geográfica real.

## Despliegue

Se puede desplegar el repositorio en Vercel / Netlify, con `npm run build` y salida `dist`. Configura fallback SPA a `index.html` para rutas de React Router.

## Requisitos cubiertos

- RF-01: demo login; SSO real pendiente de autorización.
- RF-02: horario editable con información de materia, aula y edificio; sincronización real pendiente.
- RF-03: amistades y solicitudes demo funcionales.
- RF-04: cálculo y matriz dinámica + invitaciones demo; benchmark pendiente.
- RF-05: SVG y presencia por zonas demo; mapa conceptual no geográfico.
- RF-06: doble consentimiento global e individual aplicado en vistas; **backend para enforcement real pendiente**.
- RNF-01: algoritmo simple eficiente; prueba cuantitativa pendiente.
- RNF-02: sin GPS ni historial; control visual demo únicamente.
- RNF-03: vistas responsivas web; accesibilidad y compatibilidad requieren auditoría manual.

Esta versión es un prototipo frontend y **no debe declararse lista para producción**.

## Verificación realizada al preparar esta entrega

- `npm run test`: 5 de 5 pruebas del motor de coincidencias aprobadas.
- Se validó sintaxis TS/TSX mediante el compilador TypeScript del entorno.
- **No se ejecutó `npm run build`**: el entorno de preparación no tiene acceso a la red para descargar los paquetes de npm. Al abrir el proyecto en tu equipo, ejecuta `npm install`, `npm run test` y `npm run build`.
