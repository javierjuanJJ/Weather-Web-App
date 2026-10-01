import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import type { DayWindow, HourPoint } from '../api/types'
import {
  AXIS,
  CELL,
  INNER_WIDTH,
  PLOT_LEFT,
  PLOT_WIDTH,
  RAIN,
  SKY,
  TEMP,
  TOTAL_HEIGHT,
  WIND,
  indexAt,
  xAt,
} from '../lib/chartLayout'
import {
  MM_TO_SCALE,
  RAIN_THRESHOLD,
  barHeight,
  barWidth,
  buildTimelineModel,
  polyline,
  rainFraction,
  tempY,
} from '../lib/timeline'
import type { TimelineModel } from '../lib/timeline'
import {
  formatClock,
  formatHour,
  formatMillimetres,
  formatOffset,
  formatPercent,
  formatShortDate,
  formatTemp,
  formatWind,
  windCompass,
} from '../lib/format'
import { ConditionGlyph } from './ConditionGlyph'

type Props = {
  hours: HourPoint[]
  days: DayWindow[]
  timezone: string
  place: string
  isDimmed: boolean
}

const CHART_LABEL =
  'Banda horaria de 48 horas. Usa las flechas izquierda y derecha para recorrer cada hora.'

const LABEL_EDGE = PLOT_LEFT + PLOT_WIDTH + 6
const TEMP_BASELINE = TEMP.top + TEMP.height
const GLYPH_SIZE = 14

export function TimelineChart({ hours, days, timezone, place, isDimmed }: Props) {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const model = useMemo(() => buildTimelineModel(hours, days, timezone), [hours, days, timezone])

  const geometry = useMemo(() => {
    const y = (value: number) => tempY(model.tempLow, model.tempHigh, value)
    const points = hours.map((hour, index) => ({ x: xAt(index), y: y(hour.temp) }))
    const first = points[0]
    const last = points[points.length - 1]

    const nightFlags = hours.map(() => false)
    for (const span of model.nightSpans) {
      const end = Math.min(span.endIndex, nightFlags.length - 1)
      for (let index = span.startIndex; index <= end; index += 1) nightFlags[index] = true
    }

    return {
      y,
      points,
      nightFlags,
      pastPath: polyline(points.slice(0, model.nowIndex + 1)),
      futurePath: polyline(points.slice(model.nowIndex)),
      areaPath:
        first === undefined || last === undefined
          ? ''
          : `${polyline(points)} L${last.x} ${TEMP_BASELINE} L${first.x} ${TEMP_BASELINE} Z`,
    }
  }, [hours, model])

  const nowHour = hours[model.nowIndex]
  const chartBottom = WIND.top + WIND.height

  useEffect(() => {
    const element = scrollRef.current
    if (element === null) return
    element.scrollLeft = Math.max(0, xAt(model.nowIndex) - element.clientWidth / 2)
  }, [model.nowIndex])

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (hours.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const contentX = event.clientX - rect.left + event.currentTarget.scrollLeft
    setActiveIndex(indexAt(contentX, hours.length))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (hours.length === 0) return

    if (event.key === 'Escape') {
      setActiveIndex(null)
      return
    }

    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (step === 0) return

    event.preventDefault()
    const next = Math.min(hours.length - 1, Math.max(0, (activeIndex ?? model.nowIndex) + step))
    setActiveIndex(next)

    const element = scrollRef.current
    if (element !== null) {
      element.scrollLeft = Math.max(0, xAt(next) - element.clientWidth / 2)
    }
  }

  const active = activeIndex === null ? null : (hours[activeIndex] ?? null)
  const nowLabelOnLeft = xAt(model.nowIndex) > INNER_WIDTH * 0.62

  return (
    <figure className="strip" data-dimmed={isDimmed ? 'true' : 'false'}>
      <div className="strip__legend">
        <span className="key">
          <span className="key__line key__line--past" aria-hidden="true" />
          observado
        </span>
        <span className="key">
          <span className="key__line key__line--forecast" aria-hidden="true" />
          previsto
        </span>
        <span className="key key--hint">
          Pasa el cursor o usa las flechas para leer cada hora
        </span>
      </div>

      <div className="strip__body">
        <div className="strip__labels" aria-hidden="true">
          <ScaleLabel name="cielo" height={SKY.height} />
          <Spacer height={TEMP.top - (SKY.top + SKY.height)} />
          <ScaleLabel name="temperatura" unit="°C" height={TEMP.height} />
          <Spacer height={AXIS.top - TEMP_BASELINE} />
          <ScaleLabel
            name="lluvia"
            unit={rainUnit(model.rainHasPast, model.rainHasFuture)}
            height={RAIN.height}
          />
          <Spacer height={WIND.top - (RAIN.top + RAIN.height)} />
          <ScaleLabel name="viento" unit="km/h" height={WIND.height} />
          <Spacer height={TOTAL_HEIGHT - (WIND.top + WIND.height)} />
        </div>

        <div
          className="strip__scroll"
          ref={scrollRef}
          tabIndex={0}
          aria-label={CHART_LABEL}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => {
            setActiveIndex(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setActiveIndex(null)
          }}
        >
          <svg
            className="strip__svg"
            width={INNER_WIDTH}
            height={TOTAL_HEIGHT}
            viewBox={`0 0 ${INNER_WIDTH} ${TOTAL_HEIGHT}`}
            role="presentation"
          >
            {model.nightSpans.map((span) => {
              const x = xAt(span.startIndex) - CELL / 2
              return (
                <rect
                  key={`night-${span.startIndex}`}
                  className="band band--night"
                  x={x}
                  y={SKY.top}
                  width={xAt(span.endIndex) + CELL / 2 - x}
                  height={chartBottom - SKY.top}
                />
              )
            })}

            {activeIndex !== null && (
              <rect
                className="band band--cursor"
                x={xAt(activeIndex) - CELL / 2}
                y={SKY.top}
                width={CELL}
                height={chartBottom - SKY.top}
              />
            )}

            {model.gridlines.map((value) => (
              <g key={`grid-${value}`}>
                <line
                  className="rule rule--grid"
                  x1={PLOT_LEFT}
                  y1={geometry.y(value)}
                  x2={PLOT_LEFT + PLOT_WIDTH}
                  y2={geometry.y(value)}
                />
                <text className="scale" x={LABEL_EDGE} y={geometry.y(value) + 3.5}>
                  {value}°
                </text>
              </g>
            ))}

            <path className="wash" d={geometry.areaPath} />

            {model.dayMarks.map((mark) => (
              <line
                key={`day-${mark.index}`}
                className="rule rule--day"
                x1={xAt(mark.index) - CELL / 2}
                y1={SKY.top}
                x2={xAt(mark.index) - CELL / 2}
                y2={AXIS.top + AXIS.height - 6}
              />
            ))}

            {hours.map((hour, index) => (
              <g
                key={`sky-${hour.epoch}`}
                className={geometry.nightFlags[index] === true ? 'glyph glyph--night' : 'glyph'}
                transform={`translate(${xAt(index) - GLYPH_SIZE / 2} ${SKY.top + (SKY.height - GLYPH_SIZE) / 2})`}
              >
                <ConditionGlyph kind={hour.kind} isDay={hour.isDay} size={GLYPH_SIZE} />
              </g>
            ))}

            <motion.path
              key={`past-${place}`}
              className="trace trace--past"
              d={geometry.pastPath}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            />
            <motion.path
              key={`future-${place}`}
              className="trace trace--forecast"
              d={geometry.futurePath}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: reduceMotion ? 0 : 0.28,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            />

            {model.min !== null && (
              <g>
                <circle
                  className="extreme"
                  cx={xAt(model.min.index)}
                  cy={geometry.y(model.min.value)}
                  r={3}
                />
                <text
                  className="trace-label"
                  x={keepInside(xAt(model.min.index), `mín ${Math.round(model.min.value)}°`)}
                  y={geometry.y(model.min.value) + 16}
                  textAnchor="middle"
                >
                  mín {Math.round(model.min.value)}°
                </text>
              </g>
            )}
            {model.max !== null && (
              <g>
                <circle
                  className="extreme"
                  cx={xAt(model.max.index)}
                  cy={geometry.y(model.max.value)}
                  r={3}
                />
                <text
                  className="trace-label"
                  x={keepInside(xAt(model.max.index), `máx ${Math.round(model.max.value)}°`)}
                  y={geometry.y(model.max.value) - 10}
                  textAnchor="middle"
                >
                  máx {Math.round(model.max.value)}°
                </text>
              </g>
            )}

            {hours.map((hour, index) => {
              const fraction = rainFraction(hour, model.rainScaleMax)
              if (fraction === null) return null
              const height = barHeight(fraction)
              return (
                <rect
                  key={`rain-${hour.epoch}`}
                  className={hour.offsetHours <= 0 ? 'bar bar--past' : 'bar bar--forecast'}
                  x={xAt(index) - barWidth() / 2}
                  y={RAIN.top + RAIN.height - height}
                  width={barWidth()}
                  height={height}
                />
              )
            })}
            <line
              className="rule rule--base"
              x1={PLOT_LEFT}
              y1={RAIN.top + RAIN.height}
              x2={PLOT_LEFT + PLOT_WIDTH}
              y2={RAIN.top + RAIN.height}
            />
            {model.rainHasPast && (
              <text className="scale" x={PLOT_LEFT + 2} y={RAIN.top - 6}>
                {(model.rainScaleMax / MM_TO_SCALE).toFixed(1).replace('.', ',')} mm
              </text>
            )}
            {model.rainHasFuture && (
              <text className="scale" x={LABEL_EDGE} y={RAIN.top - 6}>
                {model.rainScaleMax} %
              </text>
            )}

            {hours.map((hour, index) => {
              if (hour.windSpeed === null || hour.windDir === null) return null
              const strength =
                0.4 + 0.6 * Math.min(1, hour.windSpeed / Math.max(model.windScaleMax, 1))
              return (
                <path
                  key={`wind-${hour.epoch}`}
                  className="wind"
                  d="M-4.4 0H1.4M-1.2 -3.2 1.4 0 -1.2 3.2"
                  transform={`translate(${xAt(index)} ${WIND.top + WIND.height / 2}) rotate(${hour.windDir + 180})`}
                  opacity={strength}
                />
              )
            })}
            <text className="scale" x={LABEL_EDGE} y={WIND.top + WIND.height / 2 + 3.5}>
              {model.windScaleMax}
            </text>

            {model.ticks.map((index) => {
              const hour = hours[index]
              if (hour === undefined) return null
              return (
                <g key={`tick-${index}`}>
                  <line
                    className="tick"
                    x1={xAt(index)}
                    y1={AXIS.top + AXIS.height - 6}
                    x2={xAt(index)}
                    y2={AXIS.top + AXIS.height}
                  />
                  <text className="tick__label" x={xAt(index)} y={AXIS.top + 13}>
                    {formatHour(hour.epoch, timezone)}
                  </text>
                </g>
              )
            })}

            {model.dayMarks.map((mark) => (
              <text
                key={`daymark-${mark.index}`}
                className="daymark"
                x={xAt(mark.index) - CELL / 2 + 5}
                y={AXIS.top + AXIS.height}
              >
                {mark.label}
              </text>
            ))}

            <g className="now">
              <line
                className="now__rule"
                x1={xAt(model.nowIndex)}
                y1={SKY.top - 12}
                x2={xAt(model.nowIndex)}
                y2={chartBottom + 4}
              />
              {nowHour !== undefined && (
                <circle
                  className="now__dot"
                  cx={xAt(model.nowIndex)}
                  cy={geometry.y(nowHour.temp)}
                  r={4.5}
                />
              )}
              <text
                className="now__label"
                x={nowLabelOnLeft ? xAt(model.nowIndex) - 8 : xAt(model.nowIndex) + 8}
                y={SKY.top - 17}
                textAnchor={nowLabelOnLeft ? 'end' : 'start'}
              >
                {nowHour === undefined
                  ? 'ahora'
                  : `ahora · ${formatClock(nowHour.epoch, timezone)}`}
              </text>
            </g>
          </svg>
        </div>
      </div>

      <Readout hour={active} model={model} timezone={timezone} nowEpoch={nowHour?.epoch ?? null} />
    </figure>
  )
}

function rainUnit(hasPast: boolean, hasFuture: boolean): string {
  if (hasPast && hasFuture) return 'mm · %'
  return hasPast ? 'mm' : '%'
}

/** Mantiene la etiqueta centrada dentro del área de trazado. */
function keepInside(x: number, text: string): number {
  const half = text.length * 2.9
  return Math.min(Math.max(x, PLOT_LEFT + half), PLOT_LEFT + PLOT_WIDTH - half)
}

type ScaleLabelProps = {
  name: string
  unit?: string
  height: number
}

function ScaleLabel({ name, unit, height }: ScaleLabelProps) {
  return (
    <div className="strip__label" style={{ height }}>
      <span className="strip__label-name">{name}</span>
      {unit === undefined ? null : <span className="strip__label-unit">{unit}</span>}
    </div>
  )
}

function Spacer({ height }: { height: number }) {
  return <div style={{ height }} />
}

type ReadoutProps = {
  hour: HourPoint | null
  model: TimelineModel
  timezone: string
  nowEpoch: number | null
}

function Readout({ hour, model, timezone, nowEpoch }: ReadoutProps) {
  const compass = windCompass(hour?.windDir ?? null)

  const values =
    hour === null
      ? [
          { label: 'mínima', value: extremumText(model.min, timezone) },
          { label: 'máxima', value: extremumText(model.max, timezone) },
          {
            label: `lluvia probable (≥ ${RAIN_THRESHOLD} %)`,
            value: model.wetHoursAhead === 1 ? '1 hora' : `${model.wetHoursAhead} horas`,
          },
          { label: 'viento máximo', value: `${model.windScaleMax} km/h` },
        ]
      : [
          { label: 'temperatura', value: formatTemp(hour.temp) },
          { label: 'sensación', value: formatTemp(hour.feelsLike) },
          { label: 'viento', value: `${formatWind(hour.windSpeed)} ${compass.short}` },
          {
            label: 'lluvia',
            value:
              hour.offsetHours <= 0
                ? formatMillimetres(hour.precipMm)
                : formatPercent(hour.precipProb),
          },
        ]

  return (
    <div className="readline" aria-live="polite">
      <p className="readline__when">
        {hour === null ? (
          <>
            Ventana de 48 horas
            {nowEpoch === null ? null : (
              <span className="readline__offset">
                centrada en las {formatClock(nowEpoch, timezone)}
              </span>
            )}
          </>
        ) : (
          <>
            <ConditionGlyph kind={hour.kind} isDay={hour.isDay} size={16} />
            {formatShortDate(hour.epoch, timezone)}
            <span className="readline__clock">{formatClock(hour.epoch, timezone)}</span>
            <span className="readline__offset">{formatOffset(hour.offsetHours)}</span>
          </>
        )}
      </p>

      <ul className="readline__values">
        {values.map((entry) => (
          <li key={entry.label}>
            <span className="readline__label">{entry.label}</span>
            <span className="readline__value">{entry.value}</span>
          </li>
        ))}
      </ul>

      {hour !== null && <p className="readline__conditions">{hour.conditions}</p>}
    </div>
  )
}

function extremumText(extremum: { value: number; epoch: number } | null, timezone: string): string {
  if (extremum === null) return '—'
  return `${Math.round(extremum.value)}° a las ${formatClock(extremum.epoch, timezone)}`
}
