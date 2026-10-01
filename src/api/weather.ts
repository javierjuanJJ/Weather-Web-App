import { classifyIcon, isDayIcon, kindLabel } from './conditions'
import { kindForStatus, makeError } from './errors'
import type {
  DayWindow,
  HourPoint,
  RawDay,
  RawRecord,
  RawTimeline,
  Reading,
  WeatherSnapshot,
} from './types'

const TIMELINE_BASE =
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline'

/** La ventana que muestra la app: 24 h antes y 24 h después de la hora actual. */
export const WINDOW_HOURS = 24

const HOUR = 3600
const WINDOW_SECONDS = WINDOW_HOURS * HOUR

/**
 * Pedimos sólo las variables que la interfaz usa. `datetimeEpoch` es
 * imprescindible: las fechas llegan en hora local del lugar y las horas viven
 * anidadas dentro de cada día, así que sin el epoch no se puede filtrar la
 * ventana de forma fiable entre husos.
 */
const ELEMENTS = [
  'datetime',
  'datetimeEpoch',
  'temp',
  'feelslike',
  'windspeed',
  'winddir',
  'humidity',
  'precip',
  'precipprob',
  'conditions',
  'icon',
  'sunriseEpoch',
  'sunsetEpoch',
]

/**
 * `date1` y `date2` también aceptan tiempo Unix en segundos UTC, así que
 * pasamos el rango exacto en epochs en lugar de fechas de calendario: da igual
 * en qué huso esté el navegador o la ciudad buscada. La API incluye las horas
 * del día natural completo de cada extremo, de modo que la ventana de ±24 h
 * siempre queda cubierta.
 */
export function buildTimelineUrl(location: string, apiKey: string, nowEpoch: number): string {
  const from = nowEpoch - WINDOW_SECONDS
  const to = nowEpoch + WINDOW_SECONDS
  const params = new URLSearchParams({
    unitGroup: 'metric',
    contentType: 'json',
    include: 'current,hours,days',
    lang: 'es',
    elements: ELEMENTS.join(','),
    key: apiKey,
  })
  return `${TIMELINE_BASE}/${encodeURIComponent(location)}/${from}/${to}?${params.toString()}`
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

/**
 * Reconstruye el epoch de una hora cuando la API no envía `datetimeEpoch`,
 * combinando la fecha del día, la hora local y el desfase del huso.
 */
function reconstructEpoch(day: RawDay, hour: RawRecord, tzoffset: number): number | null {
  const date = day.datetime
  const time = hour.datetime
  if (typeof date !== 'string' || typeof time !== 'string') return null

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})/.exec(time)
  if (dayMatch === null || timeMatch === null) return null

  const [, year, month, dayOfMonth] = dayMatch
  const [, hourOfDay, minute] = timeMatch
  if (year === undefined || month === undefined || dayOfMonth === undefined) return null
  if (hourOfDay === undefined || minute === undefined) return null

  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(dayOfMonth),
    Number(hourOfDay),
    Number(minute),
  )
  return Math.round((utc - tzoffset * HOUR) / 1000)
}

function readReading(
  record: RawRecord | null | undefined,
  fallbackEpoch: number | null,
): Reading | null {
  if (record == null) return null

  const temp = toNumber(record.temp)
  const epoch = toNumber(record.datetimeEpoch) ?? fallbackEpoch
  if (temp === null || epoch === null) return null

  const icon = typeof record.icon === 'string' ? record.icon : ''
  const kind = classifyIcon(icon)

  return {
    epoch,
    temp,
    feelsLike: toNumber(record.feelslike),
    windSpeed: toNumber(record.windspeed),
    windDir: toNumber(record.winddir),
    humidity: toNumber(record.humidity),
    precipMm: toNumber(record.precip),
    precipProb: toNumber(record.precipprob),
    conditions: toText(record.conditions, kindLabel(kind)),
    icon,
    kind,
    isDay: isDayIcon(icon),
  }
}

function collectHours(days: RawDay[], tzoffset: number): Reading[] {
  return days.flatMap((day) =>
    (day.hours ?? []).flatMap((hour) => {
      const reading = readReading(hour, reconstructEpoch(day, hour ?? {}, tzoffset))
      return reading === null ? [] : [reading]
    }),
  )
}

function collectDays(days: RawDay[]): DayWindow[] {
  return days.flatMap((day) => {
    const date = toText(day.datetime, '')
    if (date === '') return []
    return [
      {
        date,
        sunriseEpoch: toNumber(day.sunriseEpoch),
        sunsetEpoch: toNumber(day.sunsetEpoch),
      },
    ]
  })
}

function buildSnapshot(payload: RawTimeline, location: string, nowEpoch: number): WeatherSnapshot {
  const days = (payload.days ?? []).filter((day): day is RawDay => day != null)
  const tzoffset = toNumber(payload.tzoffset) ?? 0

  const centre = toNumber(payload.currentConditions?.datetimeEpoch) ?? nowEpoch
  const aligned = Math.floor(centre / HOUR) * HOUR

  const hours: HourPoint[] = collectHours(days, tzoffset)
    .filter((reading) => Math.abs(reading.epoch - aligned) <= WINDOW_SECONDS)
    .sort((a, b) => a.epoch - b.epoch)
    .map((reading) => ({ ...reading, offsetHours: (reading.epoch - aligned) / HOUR }))

  const now =
    readReading(payload.currentConditions, aligned) ??
    hours.find((hour) => hour.offsetHours === 0) ??
    hours.find((hour) => hour.offsetHours > 0) ??
    hours[0]

  if (now === undefined) {
    throw makeError('malformed')
  }

  return {
    place: toText(payload.resolvedAddress, location),
    timezone: toText(payload.timezone, 'UTC'),
    queryCost: toNumber(payload.queryCost),
    now,
    hours,
    days: collectDays(days),
    fetchedAt: Date.now(),
  }
}

async function readErrorDetail(response: Response): Promise<string | null> {
  let body: string
  try {
    body = await response.text()
  } catch {
    return null
  }

  const trimmed = body.trim()
  if (trimmed === '' || trimmed.length > 300) return null

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed !== null && typeof parsed === 'object') {
      const reason = (parsed as { reason?: unknown }).reason
      if (typeof reason === 'string' && reason.trim() !== '') return reason.trim()
    }
  } catch {
    // En errores la API suele responder texto plano; lo usamos tal cual.
  }

  return trimmed
}

export async function fetchWeatherSnapshot(
  location: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<WeatherSnapshot> {
  if (apiKey.trim() === '') {
    throw makeError('missing-key')
  }
  if (import.meta.env.DEV) {
    const { FIXTURE_PAYLOAD } = await import('./__fixture')
    await new Promise((r) => setTimeout(r, 350))
    return buildSnapshot(FIXTURE_PAYLOAD, location, Math.floor(Date.now() / 1000))
  }

  const nowEpoch = Math.floor(Date.now() / 1000)
  const response = await fetch(buildTimelineUrl(location, apiKey, nowEpoch), { signal })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    throw makeError(kindForStatus(response.status), { status: response.status, detail })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw makeError('malformed', { status: response.status })
  }

  if (payload === null || typeof payload !== 'object') {
    throw makeError('malformed', { status: response.status })
  }

  return buildSnapshot(payload, location, nowEpoch)
}
