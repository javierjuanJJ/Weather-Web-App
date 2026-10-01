import type { WeatherKind } from './types'

const NIGHT = 'night'

/**
 * Los ids de icono de Visual Crossing se derivan de la condición y del turno
 * del día (p. ej. `rain-showers-day`, `clear-night`). Clasificamos por
 * subcadena para no depender de la lista exacta, que cambia entre versiones
 * del `iconSet`.
 */
export function classifyIcon(icon: string): WeatherKind {
  const id = icon.toLowerCase()

  if (id.includes('thunder')) return 'thunder'
  if (id.includes('hail')) return 'hail'
  if (id.includes('sleet') || id.includes('freezing') || id.includes('wintry')) return 'sleet'
  if (id.includes('snow')) return 'snow'
  if (id.includes('rain') || id.includes('drizzle') || id.includes('shower')) return 'rain'
  if (id.includes('fog') || id.includes('mist') || id.includes('haze')) return 'fog'
  if (id.includes('wind')) return 'wind'
  if (id.includes('overcast')) return 'overcast'
  if (id.includes('cloud')) return 'cloudy'
  if (id.includes('clear') || id.includes('sunny')) return 'clear'
  return 'unknown'
}

export function isDayIcon(icon: string): boolean {
  return !icon.toLowerCase().includes(NIGHT)
}

const LABELS: Record<WeatherKind, string> = {
  clear: 'Despejado',
  partly: 'Parcialmente nublado',
  cloudy: 'Nublado',
  overcast: 'Cubierto',
  fog: 'Niebla',
  wind: 'Viento',
  rain: 'Lluvia',
  snow: 'Nieve',
  sleet: 'Aguanieve',
  hail: 'Granizo',
  thunder: 'Tormenta',
  unknown: 'Sin datos',
}

/** Texto corto para la leyenda; el texto largo lo aporta la propia API. */
export function kindLabel(kind: WeatherKind): string {
  return LABELS[kind]
}
