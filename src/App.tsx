import { useCallback } from 'react'

import { CurrentReadout } from './components/CurrentReadout'
import { SearchBar } from './components/SearchBar'
import { Invite, LoadingPanel, MissingKey, Notice } from './components/States'
import { TimelineChart } from './components/TimelineChart'
import { readBrowserPlace, useInitialPlace } from './hooks/useBrowserPlace'
import { useWeather } from './hooks/useWeather'
import type { WeatherStatus } from './hooks/useWeather'
import type { WeatherApiError } from './api/errors'
import type { WeatherSnapshot } from './api/types'
import { formatClock, formatLocalTime, formatLongDate } from './lib/format'

type BodyProps = {
  status: WeatherStatus
  snapshot: WeatherSnapshot | null
  error: WeatherApiError | null
  isStale: boolean
  hasApiKey: boolean
  isRefreshing: boolean
  onPick: (place: string) => void
}

function Report({ snapshot, isRefreshing }: { snapshot: WeatherSnapshot; isRefreshing: boolean }) {
  return (
    <div className="report">
      <div className="report__id">
        <h1 className="report__place">{snapshot.place}</h1>
        <p className="report__meta">
          {formatLongDate(snapshot.now.epoch, snapshot.timezone)} ·{' '}
          {formatClock(snapshot.now.epoch, snapshot.timezone)}{' '}
          <span className="report__tz">{snapshot.timezone}</span>
        </p>
        <p className="report__stamp">
          Actualizado a las {formatLocalTime(new Date(snapshot.fetchedAt))}
        </p>
      </div>

      <CurrentReadout snapshot={snapshot} />

      <TimelineChart
        hours={snapshot.hours}
        days={snapshot.days}
        timezone={snapshot.timezone}
        place={snapshot.place}
        isDimmed={isRefreshing}
      />
    </div>
  )
}

function Body({
  status,
  snapshot,
  error,
  isStale,
  hasApiKey,
  isRefreshing,
  onPick,
}: BodyProps) {
  if (!hasApiKey) return <MissingKey />

  if (snapshot === null) {
    if (error !== null) {
      return (
        <Notice tone="error" title="No se pudo consultar el tiempo">
          {error.message}
        </Notice>
      )
    }
    return status === 'loading' ? <LoadingPanel /> : <Invite onPick={onPick} />
  }

  return (
    <>
      {isStale && error !== null && (
        <Notice tone="error" title="No se pudo actualizar">
          {error.message} Los datos de abajo son de las{' '}
          {formatLocalTime(new Date(snapshot.fetchedAt))}.
        </Notice>
      )}
      <Report snapshot={snapshot} isRefreshing={isRefreshing} />
    </>
  )
}

export function App() {
  const { status, snapshot, error, isRefreshing, isStale, hasApiKey, load, refresh } = useWeather()

  useInitialPlace(load)

  const handleLocate = useCallback(() => {
    void readBrowserPlace().then((place) => {
      if (place !== null) load(place)
    })
  }, [load])

  return (
    <div className="page">
      <header className="page__head">
        <p className="wordmark">
          <svg viewBox="0 0 28 16" width="28" height="16" aria-hidden="true" focusable="false">
            <path
              d="M1 13.4h26M2 12.6 7 6l4 4.5L16 1.6l4 11 5-4.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Barómetro
        </p>
        <SearchBar
          onSearch={load}
          onLocate={handleLocate}
          onRefresh={refresh}
          busy={status === 'loading'}
          disabled={!hasApiKey}
        />
      </header>

      <main className="page__main">
        <Body
          status={status}
          snapshot={snapshot}
          error={error}
          isStale={isStale}
          hasApiKey={hasApiKey}
          isRefreshing={isRefreshing}
          onPick={load}
        />
      </main>

      <footer className="page__foot">
        <p>
          Datos de{' '}
          <a
            href="https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/"
            rel="noreferrer"
          >
            Visual Crossing Weather Timeline API
          </a>
          . Cada consulta horaria gasta parte de los 1.000 registros diarios del plan gratuito, así
          que los datos se piden al buscar o al actualizar, nunca solos.
        </p>
        {snapshot !== null && snapshot.queryCost !== null && (
          <p className="page__cost">Esta consulta costó {snapshot.queryCost} registros.</p>
        )}
      </footer>
    </div>
  )
}
