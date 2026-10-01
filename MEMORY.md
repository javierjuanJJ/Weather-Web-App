# MEMORY.md — contexto persistente del proyecto

Lo que no se deduce leyendo el código. `AGENTS.md` explica **cómo trabajar** en el repo;
este fichero guarda **quién es el cliente, qué decidió y cómo va la cosa**.

## Cliente y forma de trabajar

- Idioma: **español**. Escribe docs, mensajes y textos de UI en español salvo que pida lo contrario;
  identificadores de código en inglés.
- Pide siempre verificar antes de afirmar nada ("no asumir", "verificar"). Si ejecutas un comando
  para comprobar algo, pega el resultado relevante.
- Detalles de stack que quiere explícitos, no los cambies sin preguntar:
  - React (ya instalado, v19).
  - **TypeScript estricto** (ya está en `tsconfig.app.json`; no lo relajes).
  - Datos: "algo como useFetch" para consumir la API y `useState` para los estados.
    No hay ninguna librería de data fetching instalada (ni react-query ni axios) → `fetch` nativo
    + `useState`/`useEffect`. Si algún día instalas TanStack Query, es decisión suya: pregúntalo.

## Brief (proyecto "Weather Web App", estilo contribution/community)

- Requisitos: input de ubicación; mostrar temperatura, viento, probabilidad de lluvia y
  condiciones; 24 h previas + 24 h siguientes; refresco manual por el usuario.
- Stretch goals: animaciones con framer (stretch accepted, es "make it visually appealing") y
  vista por defecto en la ubicación actual del usuario.
- Contexto: se pública en GitHub y se valora por upvotes → importa la primera impresión: README
  claro, app funcionando sin fricción y sin keys hardcodeadas. No subas nunca la API key.

## Decisiones tomadas (2026-10-01, sesión de setup)

- **API**: Visual Crossing Weather Timeline API (elegida en el brief). Documentación oficial:
  https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
- **Clave**: variable `VITE_VISUAL_CROSSING_KEY` en `.env.local` (elegido por el cliente), más un
  `.env.example` versionado con la clave vacía y `.env*` en `.gitignore`. **Pendiente**: crear
  ambos ficheros y ampliar `.gitignore` (hoy solo ignora `opencode.json`).
- **Tests**: de momento no hay runner; se acordó documentar Vitest + Testing Library + jsdom como
  opción si hace falta verificación automatizada, no instalarlo sin motivo.
- **Docs**: `AGENTS.md` y este `MEMORY.md` en español.

## Estado del proyecto

- Scaffolding de Vite 8 + React 19 + TS 5.9. **La app no existe todavía**: faltan `index.html` y
  `src/`. Primer trabajo pendiente = arrancar la app (ver "Gotchas" de `AGENTS.md`: hoy
  `npm run build` falla por `@types/node`, y `npm run typecheck` ensucia la raíz con
  `vite.config.js`).
- **0 commits**, todo untracked, sin rama por defecto. `node_modules/` no está ignorado.
- No existe `.env.local` todavía → la app no puede llamar a la API hasta que se cree.
- Remoto: `origin` → https://github.com/javierjuanJJ/Weather-Web-App.git

## Pendientes / trampas abiertas

- Confirmar si se quiere geolocalización por defecto (stretch) o dejarlo como mejora futura: exige
  contexto seguro (localhost o HTTPS), y el hint de `vite.config.ts:5` sugiere que el cliente
  quiere probarlo desde el móvil por LAN, donde `navigator.geolocation` **no** existe.
- La cuota gratis de Visual Crossing (1.000 registros/día ≈ 20 cargas de 48 h) puede ser el
  cuello de botella real: si el usuario reporta caídas, mirar caché de respuestas y `elements=`
  para reducir payload antes que pedir una key nueva.
- Sin decisiones de diseño todavía; la skill `frontend-design` (.agents/skills/frontend-design/) es
  la fuente de dirección estética cuando empiece la UI.

## Utillaje de la sesión

- MCP `context7` habilitado vía `opencode.json` (token incluido en ese fichero, que está
  gitignoreado). Úsalo antes de escribir código contra librerías/ APIs desconocidas.