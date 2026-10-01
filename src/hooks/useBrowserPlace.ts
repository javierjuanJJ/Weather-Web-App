import { useEffect } from 'react'

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 4000,
  maximumAge: 900_000,
}

/**
 * `navigator.geolocation` solo existe en contexto seguro. Con
 * `server.host: true` la app se sirve por IP de LAN, así que desde
 * `http://192.168.x.x:5173` en el móvil esta función devuelve null.
 */
export function readBrowserPlace(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        resolve(`${latitude.toFixed(4)},${longitude.toFixed(4)}`)
      },
      () => {
        resolve(null)
      },
      GEOLOCATION_OPTIONS,
    )
  })
}

/**
 * Un solo intento al abrir la app. Si la ubicación no está disponible no
 * cargamos ninguna ciudad por defecto: gastar cuota y, sobre todo, mostrar un
 * lugar que el usuario no ha pedido.
 */
export function useInitialPlace(onPlace: (place: string) => void): void {
  useEffect(() => {
    let cancelled = false

    void readBrowserPlace().then((place) => {
      if (!cancelled && place !== null) onPlace(place)
    })

    return () => {
      cancelled = true
    }
  }, [onPlace])
}
