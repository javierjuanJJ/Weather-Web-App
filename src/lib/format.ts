const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone ?? ''}|${JSON.stringify(options)}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  // Un `timezone` inesperado en la respuesta haría lanzar el constructor.
  let created: Intl.DateTimeFormat
  try {
    created = new Intl.DateTimeFormat('es-ES', {
      ...options,
      ...(timeZone === undefined ? {} : { timeZone }),
    })
  } catch {
    created = new Intl.DateTimeFormat('es-ES', options)
  }

  cache.set(key, created)
  return created
}

export function formatClock(epochSeconds: number, timeZone?: string): string {
  return formatter(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    epochSeconds * 1000,
  )
}

export function formatHour(epochSeconds: number, timeZone?: string): string {
  return formatter(timeZone, { hour: '2-digit', hourCycle: 'h23' }).format(epochSeconds * 1000)
}

export function formatShortDate(epochSeconds: number, timeZone?: string): string {
  return formatter(timeZone, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    epochSeconds * 1000,
  )
}

export function formatLongDate(epochSeconds: number, timeZone?: string): string {
  return formatter(timeZone, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    epochSeconds * 1000,
  )
}

export function formatLocalTime(date: Date): string {
  return formatter(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

/** Fecha local del lugar en formato yyyy-MM-dd, para emparejar con `days[].datetime`. */
export function localDateKey(epochSeconds: number, timeZone?: string): string {
  const parts = formatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(epochSeconds * 1000)

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

export function formatTemp(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}°`
}

export function formatWind(speed: number | null): string {
  return speed === null ? '—' : `${Math.round(speed)} km/h`
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)} %`
}

export function formatMillimetres(value: number | null): string {
  if (value === null) return '—'
  return value < 0.05 ? '0 mm' : `${value.toFixed(1).replace('.', ',')} mm`
}

const COMPASS_SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const
const COMPASS_LONG = [
  'norte',
  'noreste',
  'este',
  'sureste',
  'sur',
  'suroeste',
  'oeste',
  'noroeste',
] as const

export function windCompass(degrees: number | null): { short: string; long: string } {
  if (degrees === null) return { short: '—', long: 'dirección desconocida' }
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return { short: COMPASS_SHORT[index] ?? '—', long: COMPASS_LONG[index] ?? 'desconocida' }
}

export function formatOffset(offsetHours: number): string {
  if (offsetHours === 0) return 'ahora'
  const hours = Math.abs(offsetHours)
  return offsetHours < 0 ? `hace ${hours} h` : `dentro de ${hours} h`
}
