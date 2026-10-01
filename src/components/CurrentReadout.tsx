import type { WeatherSnapshot } from '../api/types'
import {
  formatClock,
  formatLongDate,
  formatPercent,
  formatTemp,
  formatWind,
  localDateKey,
  windCompass,
} from '../lib/format'
import { ConditionGlyph } from './ConditionGlyph'

type Props = {
  snapshot: WeatherSnapshot
}

export function CurrentReadout({ snapshot }: Props) {
  const { now, timezone } = snapshot
  const compass = windCompass(now.windDir)

  // En la hora actual la API a veces omite `precipprob`: recurrimos a la
  // primera hora prevista para no dejar la métrica vacía.
  const rainProb =
    now.precipProb ??
    snapshot.hours.find((hour) => hour.offsetHours > 0)?.precipProb ??
    null

  const today = snapshot.days.find((day) => day.date === localDateKey(now.epoch, timezone))
  const sunrise = today?.sunriseEpoch ?? null
  const sunset = today?.sunsetEpoch ?? null

  return (
    <section className="readout" aria-label="Condiciones actuales">
      <div className="readout__figure">
        <span className="readout__glyph">
          <ConditionGlyph kind={now.kind} isDay={now.isDay} size={54} />
        </span>
        <div>
          <p className="readout__temp">
            <span className="readout__deg">{Math.round(now.temp)}</span>
            <span className="readout__unit">°C</span>
          </p>
          <p className="readout__feels">Sensación {formatTemp(now.feelsLike)}</p>
        </div>
      </div>

      <div className="readout__state">
        <p className="readout__conditions">{now.conditions}</p>
        <p className="readout__caption">
          {formatLongDate(now.epoch, timezone)} · {formatClock(now.epoch, timezone)}
        </p>
      </div>

      <dl className="metrics">
        <div className="metric">
          <dt>Viento</dt>
          <dd>
            {formatWind(now.windSpeed)} <small>{compass.short}</small>
          </dd>
        </div>
        <div className="metric">
          <dt>Probabilidad de lluvia</dt>
          <dd>{formatPercent(rainProb)}</dd>
        </div>
        <div className="metric">
          <dt>Humedad</dt>
          <dd>{formatPercent(now.humidity)}</dd>
        </div>
        <div className="metric">
          <dt>Amanecer y atardecer</dt>
          <dd>
            {sunrise === null || sunset === null ? (
              '—'
            ) : (
              <>
                {formatClock(sunrise, timezone)} <small>/</small> {formatClock(sunset, timezone)}
              </>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}
