import type { WeatherKind } from '../api/types'

const SUN_RAYS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4
  return {
    x1: 10 + Math.cos(angle) * 6.4,
    y1: 10 + Math.sin(angle) * 6.4,
    x2: 10 + Math.cos(angle) * 9,
    y2: 10 + Math.sin(angle) * 9,
  }
})

const PARTLY_RAYS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4
  return {
    x1: 13.4 + Math.cos(angle) * 4.6,
    y1: 6.8 + Math.sin(angle) * 4.6,
    x2: 13.4 + Math.cos(angle) * 6.2,
    y2: 6.8 + Math.sin(angle) * 6.2,
  }
})

/** Nube de trazo continuo: tres arcos y la base recta. */
const CLOUD = 'M4.8 14.6a3 3 0 0 1 .3-6 4.3 4.3 0 0 1 8.2-1.2 3.1 3.1 0 0 1 .3 6.1Z'
/** Luna menguante: círculo exterior menos círculo interior (regla evenodd). */
const MOON = 'M10.4 1.8A8.2 8.2 0 1 0 10.4 18.2 8.2 8.2 0 1 0 10.4 1.8ZM13.9 3.4A6.6 6.6 0 1 1 13.9 16.6 7 7 0 0 0 13.9 3.4Z'
const SMALL_MOON =
  'M14 2.2A5.6 5.6 0 1 0 14 13.4 5.6 5.6 0 1 0 14 2.2ZM16.4 3.3A4.6 4.6 0 1 1 16.4 12.3 4.9 4.9 0 0 0 16.4 3.3Z'

const RAIN_STROKES = [
  'M6.6 16.6 5.4 19',
  'M10 16.6 8.8 19',
  'M13.4 16.6 12.2 19',
]

const SNOW_DOTS = [
  { cx: 6.4, cy: 17.6 },
  { cx: 10, cy: 18.4 },
  { cx: 13.6, cy: 17.6 },
]

const HAIL_RINGS = [
  { cx: 6.6, cy: 17.6, r: 1.5 },
  { cx: 10, cy: 18.4, r: 1.5 },
  { cx: 13.4, cy: 17.6, r: 1.5 },
]

const BOLT = 'M11.9 13.2 8.3 17.6h2.5l-1.5 3.2 4.3-5h-2.6z'

export type ConditionGlyphProps = {
  kind: WeatherKind
  isDay?: boolean
  size?: number
  className?: string
}

export function ConditionGlyph({
  kind,
  isDay = true,
  size = 20,
  className,
}: ConditionGlyphProps) {
  const shared = {
    className,
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  } as const

  return (
    <svg {...shared}>
      {shape(kind, isDay)}
    </svg>
  )
}

function shape(kind: WeatherKind, isDay: boolean) {
  switch (kind) {
    case 'clear':
      return isDay ? <Sun /> : <path d={MOON} fill="currentColor" stroke="none" />
    case 'partly':
      return isDay ? <PartlyDay /> : <PartlyNight />
    case 'cloudy':
      return <path d={CLOUD} />
    case 'overcast':
      return (
        <>
          <path d={CLOUD} opacity={0.42} transform="translate(-1.4 -3) scale(0.8)" />
          <path d={CLOUD} />
        </>
      )
    case 'fog':
      return (
        <>
          <path d={CLOUD} />
          <path d="M5.2 17.2h9.6M7.4 19.2h6.6" />
        </>
      )
    case 'wind':
      return <path d="M3.4 7.4h8.8a2.1 2.1 0 1 0-2.1-2.1M3.4 11h11.4a2.3 2.3 0 1 1-2.3 2.3M3.4 14.6h6.2" />
    case 'rain':
      return (
        <>
          <path d={CLOUD} />
          <path d={RAIN_STROKES.join(' ')} />
        </>
      )
    case 'snow':
      return (
        <>
          <path d={CLOUD} />
          {SNOW_DOTS.map((dot) => (
            <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r={0.9} fill="currentColor" stroke="none" />
          ))}
        </>
      )
    case 'sleet':
      return (
        <>
          <path d={CLOUD} />
          <path d="M6.6 16.6 5.4 19" />
          <circle cx={11.6} cy={17.8} r={0.9} fill="currentColor" stroke="none" />
        </>
      )
    case 'hail':
      return (
        <>
          <path d={CLOUD} />
          {HAIL_RINGS.map((ring) => (
            <circle key={`${ring.cx}-${ring.cy}`} cx={ring.cx} cy={ring.cy} r={ring.r} />
          ))}
        </>
      )
    case 'thunder':
      return (
        <>
          <path d={CLOUD} />
          <path d={BOLT} fill="currentColor" stroke="none" />
        </>
      )
    case 'unknown':
      return <circle cx={10} cy={10} r={5.4} strokeDasharray="2.6 2.6" />
  }
}

function Sun() {
  return (
    <>
      <circle cx={10} cy={10} r={4.2} />
      {SUN_RAYS.map((ray, index) => (
        <line key={index} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
      ))}
    </>
  )
}

function PartlyDay() {
  return (
    <>
      <circle cx={13.4} cy={6.8} r={2.9} />
      {PARTLY_RAYS.map((ray, index) => (
        <line key={index} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
      ))}
      <path d={CLOUD} transform="translate(-1.2 2.4) scale(0.94)" />
    </>
  )
}

function PartlyNight() {
  return (
    <>
      <path d={SMALL_MOON} fill="currentColor" stroke="none" />
      <path d={CLOUD} transform="translate(-1.2 2.4) scale(0.94)" />
    </>
  )
}
