# AGENTS.md — Weather Web App

Instrucciones para sesiones de OpenCode. Si algo de aquí contradice a `package.json`, los
`tsconfig.*` o `eslint.config.js`, ganan esos ficheros.

## Alcance del proyecto (no hay README, esto es el brief)

- Entrada de ubicación por texto → mostrar temperatura, viento, probabilidad de lluvia y
  condiciones (sol, lluvia, nubes…).
- Mostrar las 24 h previas y las 24 h siguientes.
- Botón de refresco manual. Default: ubicación actual del usuario (stretch goal).
- Stretch: animaciones con framer-motion (ya está instalado, `^13.5.0`).

## Estado real del repo (verificado)

- **No hay `src/`, ni `index.html`, ni tests, ni README.** Solo scaffolding de Vite + React 19
  + TS 5.9. `npm run dev` no arranca hasta que crees `index.html` y `src/main.tsx`.
- **Git sin ningún commit**; todos los ficheros están untracked. No hay rama por defecto aún.
- `.gitignore` contiene **solo** `opencode.json`: `node_modules/`, `dist/` y `.env*` **no** están
  ignorados. Nunca `git add .`; stagea ficheros explícitos.

## Comandos

| Acción | Comando |
| --- | --- |
| Dev server | `npm run dev` (puerto 5173, `host: true`) |
| Lint | `npm run lint` (ESLint 9 flat config, reglas con tipos) |
| **Verificar antes de dar algo por hecho** | `npx tsc -b && npm run lint` |
| Build / preview | `npm run build` · `npm run preview` |

- **No uses `npm run typecheck`**: ver gotcha 1.
- No hay runner de tests. Si una tarea necesita verificación automatizada, añade
  Vitest + `@testing-library/react` + jsdom (ninguno instalado todavía).

## Gotchas verificados que rompen la build

1. `npm run typecheck` es `tsc -b --noEmit false --emitDeclarationOnly false`: **emite JS junto a
   las fuentes**. Al ejecutarlo crea `vite.config.js` en la raíz, y Vite resuelve
   `vite.config.js` **antes** que `vite.config.ts`, así que tu config `.ts` deja de aplicarse.
   Para comprobar tipos usa `npx tsc -b` (respeta el `noEmit: true` de los tsconfig y no emite nada).
2. `npx tsc -b` y `npm run build` fallan hoy con **TS2688** en `tsconfig.node.json:8`:
   `"types": ["node"]` pero `@types/node` no está en `devDependencies`. Fix:
   `npm i -D @types/node` (o elimina la entrada `types` de ese tsconfig).
3. Geolocalización exige **contexto seguro**: `server.host: true` sirve por IP de LAN, pero desde
   un móvil en `http://192.168.x.x:5173` no existe `navigator.geolocation`. Para probar el default
   por ubicación usa `localhost` o un túnel HTTPS. `vite.config.ts:5` lo menciona como intención.

## Convenciones que choca con los defaults de React/TS

- `verbatimModuleSyntax` → tipos siempre con `import type { X } from '...'`. ESLint lo enforcea
  (`@typescript-eslint/consistent-type-imports`: error).
- `erasableSyntaxOnly` → **prohibido** `enum`, `namespace` y parameter properties. Para los
  `conditions` de la API usa uniones de literales: `type WeatherKind = 'sunny' | 'rain' | 'cloudy'`.
- `noUncheckedIndexedAccess` → `arr[i]` es `T | undefined`. Afecta directo al parseo de las ~48
  horas horarias: indexa con guardas o `flatMap`.
- `exactOptionalPropertyTypes` → no asignes `undefined` explícito a props opcionales.
- `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` fallan el build; no dejes restos.
- ESLint usa `recommendedTypeChecked` y `react-refresh/only-export-components` (warning): un
  `.tsx` de componente exporta el componente, no hooks/utiles adicionales en el mismo fichero.

## API: Visual Crossing Weather (verificado en su documentación)

- Base: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{location}`
  — `{location}` acepta dirección, dirección parcial o `lat,lon` (esto último es lo que habilita
  el default por geolocalización).
- Parámetros útiles: `unitGroup=metric`, `contentType=json`, `include=current,hours`,
  `elements=temp,windspeed,precipprob,conditions,datetime`, `key=...`.
- **La respuesta anida las horas dentro de cada día** (`days[0].hours`), no hay lista plana de horas.
- Rangos: `/timeline/{loc}/{yyyy-MM-dd}/{yyyy-MM-dd}`. El rango **termina a medianoche del día
  final** y las fechas van en hora local de la ubicación → el grano es de día natural, no de
  «ahora ±24 h». Para ±24 h exactos, filtra el campo `datetime` en cliente.
- **La cuota**: plan gratis = 1.000 registros/día y una consulta horaria de 48 h cuesta ~48
  registros. Cada carga de la app se come la cuota ⇒ nada de polling/refetch automático: dispara
  el fetch solo al enviar la búsqueda o al pulsar refrescar.
- Desmonta los fetches con `AbortController` en el cleanup del `useEffect` para no dejar
  peticiones colgadas ni warnings de estado tras desmontar.

## Entorno y secretos

- No existe ningún `.env*`. Crea `.env.local` con `VITE_VISUAL_CROSSING_KEY=...` (Vite solo expone
  variables `VITE_*` al cliente) y versiona un `.env.example` con la clave vacía.
- Añade `.env*`, `dist/` y `node_modules/` a `.gitignore` antes de tu primer commit.
- `opencode.json` está gitignoreado a propósito porque lleva el token de context7: no lo copies a
  código, docs ni commits.

## Documentarte antes de inventar (context7)

- MCP `context7` está configurado en `opencode.json` (remote, `https://mcp.context7.com/mcp`).
  Ante cualquier API o librería que no domines: primero `resolve-library-id`, luego
  `query-docs` con **una sola pregunta por call**. Ejemplos típicos: React 19, framer-motion v13,
  Vite 8, tipos de la respuesta de Visual Crossing.
- Si context7 no cubre algo, usa `webfetch` de la doc oficial y deja la URL en el resumen.
  Prohibido escribir código adivinando firmas de API.

## Estilo de interfaz

- Skill `frontend-design` disponible en `.agents/skills/frontend-design/SKILL.md` (cargable con la
  herramienta `skill`; `skills-lock.json` lo fija por hash). Si no hay dirección de diseño en el
  brief, esa skill manda: no improvises una plantilla genérica.
