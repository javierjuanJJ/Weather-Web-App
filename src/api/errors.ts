export type WeatherErrorKind =
  | 'missing-key'
  | 'unauthorized'
  | 'request'
  | 'not-found'
  | 'quota'
  | 'server'
  | 'network'
  | 'malformed'

export type WeatherErrorOptions = {
  status?: number | null
  detail?: string | null
}

export class WeatherApiError extends Error {
  readonly kind: WeatherErrorKind
  readonly status: number | null
  /** Texto crudo que devuelve la API, si vino alguno. */
  readonly detail: string | null

  constructor(kind: WeatherErrorKind, message: string, options: WeatherErrorOptions = {}) {
    super(message)
    this.name = 'WeatherApiError'
    this.kind = kind
    this.status = options.status ?? null
    this.detail = options.detail ?? null
  }
}

const GENERIC: Record<WeatherErrorKind, string> = {
  'missing-key':
    'Falta la clave de la API. Copia .env.example a .env.local, define VITE_VISUAL_CROSSING_KEY y reinicia el servidor.',
  unauthorized: 'La clave de la API no es válida. Revisa VITE_VISUAL_CROSSING_KEY en .env.local.',
  request: 'La API rechazó la consulta. Prueba con otra ciudad, dirección o código postal.',
  'not-found': 'Ese lugar no existe en la base de datos de Visual Crossing.',
  quota: 'Has agotado los 1.000 registros diarios del plan gratuito. Vuelve a intentarlo mañana.',
  server: 'Visual Crossing está teniendo problemas. Inténtalo dentro de un rato.',
  network: 'No se pudo conectar con la API. Revisa tu conexión a internet.',
  malformed: 'La API devolvió una respuesta que no se entiende.',
}

export function kindForStatus(status: number): WeatherErrorKind {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status === 429) return 'quota'
  if (status >= 500) return 'server'
  return 'request'
}

/** Mensajes en los que el texto de la API explica mejor el fallo que el nuestro. */
const TRUST_DETAIL: ReadonlySet<WeatherErrorKind> = new Set([
  'request',
  'unauthorized',
  'not-found',
  'quota',
])

export function makeError(
  kind: WeatherErrorKind,
  options: WeatherErrorOptions = {},
): WeatherApiError {
  const detail = options.detail?.trim() ?? ''
  const message = TRUST_DETAIL.has(kind) && detail !== '' ? detail : GENERIC[kind]
  return new WeatherApiError(kind, message, {
    ...(options.status === undefined ? {} : { status: options.status }),
    detail: detail === '' ? null : detail,
  })
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError'
}

export function toWeatherError(value: unknown): WeatherApiError {
  if (value instanceof WeatherApiError) return value
  if (value instanceof TypeError) return makeError('network')
  return makeError('server')
}
