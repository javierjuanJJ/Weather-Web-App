# Barómetro

Aplicación web del tiempo con un gráfico de 48 horas: las 24 horas que ya han pasado
y las 24 que vienen. Pensada para consultar el tiempo de cualquier lugar escribiendo
una ciudad, una dirección o un código postal.

![Barómetro](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)

---

## Índice

- [Características](#características)
- [Stack](#stack)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración de la API](#configuración-de-la-api)
- [Scripts](#scripts)
- [Cómo funciona](#cómo-funciona)
- [La API de Visual Crossing](#la-api-de-visual-crossing)
- [Cuota y por qué no hay refresco automático](#cuota-y-por-qué-no-hay-refresco-automático)
- [Geolocalización](#geolocalización)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Accesibilidad](#accesibilidad)
- [Convenciones del código](#convenciones-del-código)
- [Despliegue](#despliegue)
- [Licencia](#licencia)

---

## Características

- **Búsqueda por texto**: acepta ciudad, dirección parcial o código postal.
- **Lectura actual**: temperatura, sensación térmica, viento (velocidad y rumbo),
  humedad y probabilidad de lluvia, con el código de condición en claro.
- **Banda horaria de 48 h**: temperatura, precipitación, viento y cielo hora a hora,
  con el pasado en tinta y el futuro en el color de previsión.
- **Cursor de "ahora"**: la columna actual está marcada; se puede desplazar con las
  flechas del teclado y pasando el puntero por encima para leer cualquier hora.
- **Bandas nocturnas**: el amanecer y el atardecer de cada día se dibujan sobre el
  gráfico usando los epochs que devuelve la API.
- **Refresco manual**: un botón, sin polling, por respeto a la cuota gratuita.
- **Ubicación actual**: opcional, vía geolocalización del navegador.
- **Estados completos**: invitación inicial, cargando, error, aviso de cuota y aviso
  de clave ausente.
- **Datos obsoletos**: si un refresco falla, los datos anteriores siguen en pantalla
  avisos de que son viejos, en vez de desaparecer.
- **Sin dependencias de red extra**: todo el gráfico es SVG y CSS propios.

## Stack

| Pieza | Versión | Para qué |
| --- | --- | --- |
| [Vite](https://vite.dev) | `^8.3.2` | Bundler y servidor de desarrollo |
| [React](https://react.dev) | `^19.3.0` | UI, con `useState`/`useEffect` y nada más |
| [TypeScript](https://www.typescriptlang.org) | `~5.9.3` | Tipado en modo estricto |
| [framer-motion](https://motion.dev) | `^13.5.0` | Trazo de la curva y giro del botón de refresco |
| [ESLint](https://eslint.org) | `^9.39.0` | Lint con reglas tipadas (`recommendedTypeChecked`) |
| IBM Plex Sans / IBM Plex Mono | vía CDN | Tipografía (fuente y datos) |

No hay cliente HTTP, ni librería de estado, ni librería de gráficos: `fetch` nativo y
SVG a mano.

## Requisitos previos

- **Node.js `^20.19.0` o `>=22.12.0`** (lo exige Vite 8).
- **npm** 10 o superior.
- Una cuenta gratuita en [Visual Crossing](https://www.visualcrossing.com/subscription)
  para obtener la clave de la API.

## Instalación

```bash
git clone https://github.com/javierjuanJJ/Weather-Web-App.git
cd Weather-Web-App
npm install
cp .env.example .env.local   # y rellena la clave
npm run dev
```

La app queda en <http://localhost:5173>.

## Configuración de la API

La clave se lee de una variable de entorno `VITE_*`, que es la única clase de variable
que Vite expone al cliente.

```bash
# .env.local
VITE_VISUAL_CROSSING_KEY=tu_clave_aqui
```

Detalles que conviene saber:

- `.env.local` está en `.gitignore` y **nunca** se sube al repositorio.
- `.env.example` sí está versionado y sirve de plantilla; Vite ignora los `.env*`
  salvo ese.
- Vite lee el entorno al arrancar: después de cambiar la clave, reinicia el servidor.
- La clave viaja en la query string de cada petición a `weather.visualcrossing.com`.
  Es una clave de cliente: sirve para desarrollo, no para esconderla. Si en algún
  momento hiciera falta protegerla, hay que poner un proxy en medio.
- Sin clave, la app arranca igualmente y muestra el aviso `MissingKey` con las
  instrucciones, en vez de fallar en blanco.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 5173 (`host: true`). |
| `npm run build` | `tsc -b` y luego `vite build` a `dist/`. |
| `npm run preview` | Sirve `dist/` para comprobar el build. |
| `npm run lint` | ESLint sobre todo el proyecto. |

> **No uses `npm run typecheck`.** Ese script está deliberadamente definido como
> `tsc -b --noEmit false --emitDeclarationOnly false`, es decir, **emite JavaScript
> junto a las fuentes**. Al ejecutarlo crea un `vite.config.js` en la raíz, y Vite
> resuelve `vite.config.js` antes que `vite.config.ts`, de modo que tu configuración
> de Vite deja de aplicarse sin que nada avise. Para comprobar tipos usa
> `npx tsc -b`, que respeta el `noEmit: true` de los tsconfig.

## Cómo funciona

```
SearchBar / botón "Mi ubicación" / botón refrescar
                    │
                    ▼
              useWeather.load(place)
                    │  request = { id: n+1, place }
                    ▼
        useEffect(request) → AbortController
                    │
                    ▼
        fetchWeatherSnapshot(place, key, signal)
                    │  GET /timeline/{place}/{date1}/{date2}
                    │  el rango va en epochs Unix (ahora ± 24 h)
                    ▼
        buildSnapshot()  aplana days[].hours y recorta la ventana
                    │
                    ▼
   { status, snapshot, error, isRefreshing, isStale, hasApiKey }
                    │
                    ▼
   App → Body → Report → CurrentReadout + TimelineChart
```

Detalles del diseño de estado:

- **Una consulta por acción.** Nada de polling ni reintentos automáticos.
- **Cada petición es abortable.** El `useEffect` crea un `AbortController` y lo
  aborta en el cleanup, así que buscar dos ciudades seguidas no deja la primera
  respuesta escribiendo sobre la segunda.
- **Un contador `id` discrimina respuestas.** Como el abort no es instantáneo, cada
  petición lleva un número y solo se acepta la que coincide con la actual.
- **El estado se deriva, no se setea en el efecto.** `status`, `isRefreshing` e
  `isStale` se calculan a partir de `request` y `outcome`, lo que además de ser
  correcto evita el error `react-hooks/set-state-in-effect` de ESLint.
- **El último resultado bueno sobrevive a los fallos** (campo `isStale`).

## La API de Visual Crossing

Endpoint usado:

```
https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{location}/{date1}/{date2}
```

Parámetros de la petición:

| Parámetro | Valor | Motivo |
| --- | --- | --- |
| `{location}` | texto codificado o `lat,lon` | Ciudad, dirección o coordenadas de la geolocalización. |
| `{date1}` | epoch Unix de ahora − 24 h | Las fechas de calendario son en hora local del lugar, así que se pasa el rango exacto en epochs y da igual el huso. |
| `{date2}` | epoch Unix de ahora + 24 h | La API incluye el día natural completo de cada extremo, así que la ventana siempre queda cubierta. |
| `unitGroup` | `metric` | °C, km/h y mm. |
| `contentType` | `json` | Respuesta parseable. |
| `include` | `current,hours,days` | Condiciones actuales, horas y las ventanas de día. |
| `lang` | `es` | Textos de condición en español. |
| `elements` | ver abajo | Solo se pide lo que la interfaz usa. |
| `key` | tu clave | Autenticación. |

Elementos solicitados:

```
datetime, datetimeEpoch, temp, feelslike, windspeed, winddir,
humidity, precip, precipprob, conditions, icon,
sunriseEpoch, sunsetEpoch
```

`datetimeEpoch`, `sunriseEpoch` y `sunsetEpoch` no son prescindibles: sin epochs no
se puede alinear la ventana horaria ni dibujar las bandas nocturnas de forma fiable
entre husos.

Detalles de la respuesta que condicionan el parseo:

- **Las horas vienen anidadas dentro de cada día** (`days[0].hours`), no hay lista
  plana. La app las aplana y ordena por epoch.
- Si un registro llega sin `datetimeEpoch`, se reconstruye con la fecha del día, la
  hora local y el `tzoffset` que devuelve la respuesta.
- El pasado se pinta con `precip` en milímetros y el futuro con `precipprob` en
  porcentaje, porque el pasado ya ocurrió y el futuro es una probabilidad.
- Si el icono y el texto no cuadran, el texto manda para la etiqueta y el icono para
  el dibujo.

Errores mapeados a mensajes en español (`src/api/errors.ts`):

| HTTP | Estado interno | Qué muestra el usuario |
| --- | --- | --- |
| — | `missing-key` | Falta `VITE_VISUAL_CROSSING_KEY`. |
| 401 | `unauthorized` | Clave incorrecta o caducada. |
| 400 | `request` | La ubicación o los parámetros no valen. |
| 404 | `not-found` | No encuentra ese lugar. |
| 429 | `quota` | Se agotaron los registros del día. |
| 5xx | `server` | Fallo del proveedor. |
| red | `network` | Sin conexión o fallo de red. |
| JSON inválido | `malformed` | Respuesta inesperada. |

## Cuota y por qué no hay refresco automático

El plan gratuito de Visual Crossing da **1.000 registros al día**, y una consulta
horaria de 48 h cuesta alrededor de **48–73 registros** (la respuesta incluye el
`queryCost` real, que la app muestra en el pie). Es decir: unas 15–20 búsquedas
diarias.

Por eso la app **no hace polling, ni refresco automático, ni reintentos**. Solo
consulta cuando el usuario busca, pide su ubicación o pulsa el botón de refresco.
El coste de la última consulta se muestra siempre bajo el gráfico para que sea
visible.

## Geolocalización

El botón «Mi ubicación» usa `navigator.geolocation` y envía las coordenadas
redondeadas a 4 decimales como `{location}`, que es lo que habilita el endpoint por
`lat,lon`.

- Requiere **contexto seguro**: `https://` o `http://localhost`. Desde el móvil
  accediendo a `http://192.168.x.x:5173` (que es lo que sirve `host: true`) no hay
  `navigator.geolocation` y el navegador lo deniega.
- Si el usuario la rechaza, no hay ciudad de reserva: la app lo dice y ofrece buscar
  a mano. Es una decisión consciente, porque adivinar una ubicación gastaría cuota
  con una consulta que el usuario no ha pedido.
- En la primera carga se intenta la geolocalización solo si el navegador la ofrece.

## Estructura del proyecto

```
.
├── index.html                 Documento, fuentes de IBM Plex y favicon SVG
├── vite.config.ts             host: true, puerto 5173
├── eslint.config.js           Flat config con recommendedTypeChecked
├── tsconfig.*.json            Referencias de proyecto, noEmit, strict
├── .env.example               Plantilla de la clave (versionada)
└── src/
    ├── main.tsx               Punto de entrada
    ├── App.tsx                Composición: cabecera, cuerpo, pie
    ├── index.css              Tokens de diseño, layout, responsive, estilos SVG
    ├── vite-env.d.ts          Tipado de import.meta.env
    ├── api/
    │   ├── types.ts           Tipos del dominio y de la respuesta cruda
    │   ├── weather.ts         URL, fetch, parseo del timeline y errores
    │   ├── errors.ts          WeatherApiError y mapeo de códigos
    │   └── conditions.ts      Clasificación de iconos y etiquetas
    ├── hooks/
    │   ├── useWeather.ts      Estado de la consulta, refresco y cancelación
    │   └── useBrowserPlace.ts Geolocalización
    ├── lib/
    │   ├── timeline.ts        Modelo del gráfico: escalas, extremos, bandas
    │   ├── chartLayout.ts     Geometría compartida de las 49 columnas
    │   └── format.ts          Fechas, horas, viento y unidades con Intl
    └── components/
        ├── TimelineChart.tsx  El gráfico SVG de 48 h y el cursor
        ├── CurrentReadout.tsx Condiciones actuales
        ├── SearchBar.tsx      Búsqueda, ubicación y refresco
        ├── States.tsx         Invite, MissingKey, LoadingPanel, Notice
        └── ConditionGlyph.tsx Iconos SVG de las condiciones
```

El flujo de datos va en un solo sentido: los componentes piden, los hooks deciden y
`api/` habla con el exterior. Nada de contexto global, nada de estado duplicado.

## Decisiones de diseño

La interfaz es una **hoja de registro de un barómetro**, no una tarjeta de app
meteorológica genérica:

- **Papel frío** (`#e9eef1`) con **tinta azul oscuro** (`#14232e`) y un único acento
  **ocre** (`#a9760a`) reservado para el futuro. Semáforos descartados.
- **Tipografía con función**: IBM Plex Sans para el texto, IBM Plex Mono para
  cualquier número. Las cifras no bailan entre actualizaciones.
- **Regla de contraste**: nunca más de dos pesos, y el acento no se usa en texto
  pequeño para no fallar contraste.
- **El gráfico es un instrumento de lectura**: fondo con retícula vertical muy tenue,
  bandas nocturnas marcadas, etiquetas de hora cada 3 h, día completo separado del
  siguiente con líneas más fuertes, y extremos de temperatura rotulados.
- **Animación con propósito**: la curva se dibuja al entrar, el botón de refresco
  gira mientras carga, y todo se anula con `useReducedMotion`.
- **Responsive de verdad**: la banda horaria se desplaza horizontalmente con scroll
  nativo (`overflow-x`) y mantiene fija la columna de etiquetas; en móvil el layout
  pasa a una columna.

## Accesibilidad

- Etiquetas reales y `role="search"` en el formulario, con `<label>` oculto para
  lectores de pantalla.
- El botón de refresco tiene `aria-label`; el de ubicación, texto visible.
- La banda horaria es una región enfocable (`tabIndex={0}`) con `aria-label` que
  explica cómo recorrerla, y su SVG es decorativo (`aria-hidden`/`role="presentation"`):
  la información existe como texto, no solo como dibujo.
- La lectura de la hora bajo el cursor se anuncia con `aria-live="polite"`, y los
  avisos de error usan `role="alert"`.
- Navegación de la banda con las flechas del teclado.
- Se respeta `prefers-reduced-motion`.
- Contraste verificado en los dos extremos de la paleta.

## Convenciones del código

El proyecto tiene TypeScript en modo estricto y con algunas banderas que castigan
los descuidos:

| Bandera | Por qué importa aquí |
| --- | --- |
| `verbatimModuleSyntax` | Los tipos se importan con `import type { X }`. ESLint lo exige. |
| `erasableSyntaxOnly` | Prohibidos `enum`, `namespace` y parameter properties. Las condiciones del tiempo son uniones de literales: `type WeatherKind = 'clear' \| 'partly' \| 'cloudy' \| 'rain' \| 'snow' \| 'thunder' \| 'unknown'`. |
| `noUncheckedIndexedAccess` | `arr[i]` es `T \| undefined`. Afecta directo al parseo de ~49 horas, de ahí las guardas y los `flatMap`. |
| `exactOptionalPropertyTypes` | No se asigna `undefined` explícito a props opcionales. |
| `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` | Fallan el build. |
| `noFallthroughCasesInSwitch` | En el mapeo de iconos a condiciones. |

Además:

- **Identificadores en inglés, textos en español.** Los `WeatherKind` (`sunny`,
  `rain`, `cloudy`) están en inglés porque son claves internas, no texto de la
  interfaz; lo que ve el usuario sale traducido en `conditions.ts` y en la API con
  `lang=es`.
- Un `.tsx` de componente exporta el componente. Si un hook o un helper necesita
  vivir en su propio fichero para no disparar el aviso de `react-refresh`.
- **Imports sin extensión.** No hay `allowImportingTsExtensions`, así que
  `./weather.js` no compila: se importa `./weather`.
- Nada de `any`. Los datos crudos de la API entran como `unknown` y se estrechan con
  `toNumber`, `toText` y guardas de tipo.
- Los fetches se desmontan con `AbortController` en el cleanup del `useEffect`.

## Despliegue

```bash
npm run build     # genera dist/
npm run preview   # comprueba el resultado en local
```

`dist/` es estático y se puede subir a GitHub Pages, Netlify, Vercel, Cloudflare
Pages o cualquier CDN. Recordatorio: la clave viaja en el cliente, así que cualquiera
que abra las herramientas de desarrollo puede verla. Para un despliegue público con
tráfico real, lo correcto es un proxy que guarde la clave en el servidor.

## Licencia

Todavía no declarada: el repositorio no tiene fichero `LICENSE` y `package.json` está
marcado como `private`. Si vas a publicarlo, añade la licencia que quieras (MIT,
Apache-2.0, GPL…) con un `LICENSE` en la raíz.
