import type { DayWindow, HourPoint } from '../api/types'
import { CELL, RAIN, TEMP, WINDOW_FALLBACK_INDEX, xAt } from './chartLayout'
import { formatHour, formatShortDate, localDateKey } from './format'

/** Escala común de la banda de lluvia: 4 mm se dibujan como el 100 %. */
export const MM_TO_SCALE = 25
/** Umbral desde el que consideramos probable la lluvia. */
export const RAIN_THRESHOLD = 30

export type Span = { startIndex: number; endIndex: number }
export type Extremum = { value: number; index: number; epoch: number }

export type TimelineModel = {
  nowIndex: number
  min: Extremum | null
  max: Extremum | null
  tempLow: number
  tempHigh: number
  gridlines: number[]
  dayMarks: { index: number; label: string }[]
  nightSpans: Span[]
  ticks: number[]
  rainScaleMax: number
  rainHasPast: boolean
  rainHasFuture: boolean
  windScaleMax: number
  wetHoursAhead: number
}

function extremesByIndex(hours: HourPoint[]): { min: Extremum | null; max: Extremum | null } {
  let min: Extremum | null = null
  let max: Extremum | null = null

  hours.forEach((hour, index) => {
    const extremum: Extremum = { value: hour.temp, index, epoch: hour.epoch }
    if (min === null || hour.temp < min.value) min = extremum
    if (max === null || hour.temp > max.value) max = extremum
  })

  return { min, max }
}

function temperatureScale(min: number, max: number): { low: number; high: number; lines: number[] } {
  const pad = Math.max(max - min, 4) * 0.18
  const low = Math.floor((min - pad) / 5) * 5
  const high = Math.max(low + 10, Math.ceil((max + pad) / 5) * 5)

  const lines: number[] = []
  for (let value = low; value <= high; value += 5) lines.push(value)
  return { low, high, lines }
}

/**
 * Bandas nocturnas usando el amanecer y el atardecer reales del lugar. Si la API
 * no los envía recurrimos al turno que deduce el propio icono de la condición.
 */
function nightSpans(hours: HourPoint[], days: DayWindow[], timezone: string): Span[] {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const spans: Span[] = []
  let start: number | null = null

  hours.forEach((hour, index) => {
    const day = byDate.get(localDateKey(hour.epoch, timezone))
    const known =
      day !== undefined && day.sunriseEpoch !== null && day.sunsetEpoch !== null
    const night = known
      ? hour.epoch < (day?.sunriseEpoch ?? 0) || hour.epoch >= (day?.sunsetEpoch ?? 0)
      : !hour.isDay

    if (night && start === null) start = index
    if (!night && start !== null) {
      spans.push({ startIndex: start, endIndex: index - 1 })
      start = null
    }
  })

  if (start !== null) spans.push({ startIndex: start, endIndex: hours.length - 1 })
  return spans
}

export function buildTimelineModel(
  hours: HourPoint[],
  days: DayWindow[],
  timezone: string,
): TimelineModel {
  const { min, max } = extremesByIndex(hours)

  const temps = hours.map((hour) => hour.temp)
  const scale = temperatureScale(Math.min(...temps), Math.max(...temps))

  const dayMarks: { index: number; label: string }[] = []
  const ticks: number[] = []
  hours.forEach((hour, index) => {
    const previous = hours[index - 1]
    if (
      previous !== undefined &&
      localDateKey(previous.epoch, timezone) !== localDateKey(hour.epoch, timezone)
    ) {
      dayMarks.push({ index, label: formatShortDate(hour.epoch, timezone) })
    }
    if (Number(formatHour(hour.epoch, timezone)) % 3 === 0) ticks.push(index)
  })

  let rainScaleMax = 10
  let rainHasPast = false
  let rainHasFuture = false
  hours.forEach((hour) => {
    if (hour.offsetHours <= 0 && hour.precipMm !== null) {
      rainHasPast = true
      rainScaleMax = Math.max(rainScaleMax, hour.precipMm * MM_TO_SCALE)
    }
    if (hour.offsetHours > 0 && hour.precipProb !== null) {
      rainHasFuture = true
      rainScaleMax = Math.max(rainScaleMax, hour.precipProb)
    }
  })
  rainScaleMax = Math.ceil(rainScaleMax / 10) * 10

  const speeds = hours
    .map((hour) => hour.windSpeed)
    .filter((speed): speed is number => speed !== null)
  const windScaleMax = Math.max(10, Math.ceil(Math.max(0, ...speeds) / 5) * 5)

  const wetHoursAhead = hours.filter(
    (hour) => hour.offsetHours > 0 && (hour.precipProb ?? 0) >= RAIN_THRESHOLD,
  ).length

  const nowIndex = hours.findIndex((hour) => hour.offsetHours === 0)

  return {
    nowIndex: nowIndex === -1 ? Math.min(WINDOW_FALLBACK_INDEX, hours.length - 1) : nowIndex,
    min,
    max,
    tempLow: scale.low,
    tempHigh: scale.high,
    gridlines: scale.lines,
    dayMarks,
    nightSpans: nightSpans(hours, days, timezone),
    ticks,
    rainScaleMax,
    rainHasPast,
    rainHasFuture,
    windScaleMax,
    wetHoursAhead,
  }
}

/** Escala vertical de la temperatura dentro de la banda `TEMP`. */
export function tempY(low: number, high: number, value: number): number {
  const ratio = (value - low) / Math.max(high - low, 1)
  const clamped = Math.min(1, Math.max(0, ratio))
  return TEMP.top + TEMP.height - clamped * TEMP.height
}

/** Polilínea recta: un registrador une los datos con segmentos, sin suavizar. */
export function polyline(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
}

export function barHeight(fraction: number): number {
  return Math.max(1.5, fraction * RAIN.height)
}

export function barWidth(): number {
  return CELL - 7
}

/** Fracción 0..1 de la barra de lluvia, o null si no hay dato para esa hora. */
export function rainFraction(hour: HourPoint, scaleMax: number): number | null {
  const raw = hour.offsetHours <= 0 ? hour.precipMm : hour.precipProb
  if (raw === null) return null
  const scaled = hour.offsetHours <= 0 ? raw * MM_TO_SCALE : raw
  if (scaled <= 0) return null
  return Math.min(1, scaled / scaleMax)
}

export { xAt }
