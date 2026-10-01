/**
 * Tipos del dominio. `HourPoint` y `WeatherSnapshot` son lo que consume la
 * interfaz; los tipos `Raw*` reflejan (de forma laxa) lo que devuelve Visual
 * Crossing, donde cualquier elemento puede faltar o venir a null.
 */

export type WeatherKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'wind'
  | 'rain'
  | 'snow'
  | 'sleet'
  | 'hail'
  | 'thunder'
  | 'unknown'

export type Reading = {
  epoch: number
  temp: number
  feelsLike: number | null
  windSpeed: number | null
  windDir: number | null
  humidity: number | null
  precipMm: number | null
  precipProb: number | null
  conditions: string
  icon: string
  kind: WeatherKind
  isDay: boolean
}

export type HourPoint = Reading & {
  /** Posición dentro de la ventana: 0 = hace 24 h, 24 = ahora, 48 = dentro de 24 h. */
  offsetHours: number
}

export type DayWindow = {
  /** Fecha local de la ubicación (yyyy-MM-dd). */
  date: string
  sunriseEpoch: number | null
  sunsetEpoch: number | null
}

export type WeatherSnapshot = {
  place: string
  timezone: string
  queryCost: number | null
  now: Reading
  hours: HourPoint[]
  days: DayWindow[]
  fetchedAt: number
}

export type RawRecord = {
  datetime?: string | null
  datetimeEpoch?: number | null
  temp?: number | null
  feelslike?: number | null
  windspeed?: number | null
  winddir?: number | null
  humidity?: number | null
  precip?: number | null
  precipprob?: number | null
  conditions?: string | null
  icon?: string | null
}

export type RawDay = {
  datetime?: string | null
  sunriseEpoch?: number | null
  sunsetEpoch?: number | null
  hours?: (RawRecord | null)[] | null
}

export type RawTimeline = {
  queryCost?: number | null
  resolvedAddress?: string | null
  timezone?: string | null
  tzoffset?: number | null
  currentConditions?: RawRecord | null
  days?: (RawDay | null)[] | null
}
