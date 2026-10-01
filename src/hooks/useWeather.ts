import { useCallback, useEffect, useState } from 'react'

import { isAbortError, toWeatherError } from '../api/errors'
import type { WeatherApiError } from '../api/errors'
import type { WeatherSnapshot } from '../api/types'
import { fetchWeatherSnapshot } from '../api/weather'

const API_KEY: string = import.meta.env.VITE_VISUAL_CROSSING_KEY ?? ''

export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error'

type Request = { id: number; place: string }

type Outcome = {
  id: number
  /** Último resultado bueno: se conserva aunque el refresco falle. */
  snapshot: WeatherSnapshot | null
  error: WeatherApiError | null
}

export type WeatherState = {
  status: WeatherStatus
  snapshot: WeatherSnapshot | null
  error: WeatherApiError | null
  /** Ya hay datos en pantalla pero se están reconsultando. */
  isRefreshing: boolean
  /** Hay datos en pantalla pero la última consulta falló. */
  isStale: boolean
  hasApiKey: boolean
  load: (place: string) => void
  refresh: () => void
}

function statusOf(request: Request | null, outcome: Outcome | null): WeatherStatus {
  if (request === null) return 'idle'
  if (outcome === null || outcome.id !== request.id) return 'loading'
  return outcome.error === null ? 'ready' : 'error'
}

/**
 * Una consulta por acción: al enviar la búsqueda, al pedir la ubicación o al
 * pulsar refresco. Nunca hay polling — el plan gratuito son 1.000 registros
 * diarios y cada ventana horaria se come casi 50.
 */
export function useWeather(): WeatherState {
  const [request, setRequest] = useState<Request | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    if (request === null) return

    const controller = new AbortController()
    let cancelled = false

    void fetchWeatherSnapshot(request.place, API_KEY, controller.signal).then(
      (snapshot) => {
        if (!cancelled) setOutcome({ id: request.id, snapshot, error: null })
      },
      (cause: unknown) => {
        if (cancelled || isAbortError(cause)) return
        setOutcome((previous) => ({
          id: request.id,
          snapshot: previous?.snapshot ?? null,
          error: toWeatherError(cause),
        }))
      },
    )

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [request])

  const load = useCallback((place: string) => {
    const trimmed = place.trim()
    if (trimmed === '') return
    setRequest((previous) => ({ id: (previous?.id ?? 0) + 1, place: trimmed }))
  }, [])

  const refresh = useCallback(() => {
    setRequest((previous) =>
      previous === null ? previous : { ...previous, id: previous.id + 1 },
    )
  }, [])

  const status = statusOf(request, outcome)
  const snapshot = outcome?.snapshot ?? null

  return {
    status,
    snapshot,
    error: status === 'error' ? (outcome?.error ?? null) : null,
    isRefreshing: status === 'loading' && snapshot !== null,
    isStale: status === 'error' && snapshot !== null,
    hasApiKey: API_KEY.trim() !== '',
    load,
    refresh,
  }
}
