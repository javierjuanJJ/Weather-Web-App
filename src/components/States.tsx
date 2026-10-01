import type { ReactNode } from 'react'

export function Notice({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'error'
  title: string
  children: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p className="notice__title">{title}</p>
      <p className="notice__body">{children}</p>
    </div>
  )
}

const EXAMPLES = ['Madrid', 'Barcelona', 'Ciudad de México', 'Buenos Aires']

export function Invite({ onPick }: { onPick: (place: string) => void }) {
  return (
    <section className="invite">
      <h2>Dime dónde mirar</h2>
      <p>
        Escribe una ciudad, una dirección o un código postal. Si el navegador te deja, abrimos
        con tu ubicación y a partir de ahí solo actualizas cuando tú lo pides.
      </p>
      <ul className="examples">
        {EXAMPLES.map((place) => (
          <li key={place}>
            <button className="btn btn--ghost" type="button" onClick={() => onPick(place)}>
              {place}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MissingKey() {
  return (
    <section className="invite">
      <h2>Falta la clave de la API</h2>
      <p>
        Esta app usa Visual Crossing Weather. Copia <code>.env.example</code> a{' '}
        <code>.env.local</code>, pega tu clave y reinicia el servidor:
      </p>
      <pre className="snippet">
        <code>{'cp .env.example .env.local\n# abre .env.local y define VITE_VISUAL_CROSSING_KEY\nnpm run dev'}</code>
      </pre>
      <p>
        La clave gratuita se pide en{' '}
        <a href="https://www.visualcrossing.com/weather-query-builder/" rel="noreferrer">
          visualcrossing.com
        </a>
        .
      </p>
    </section>
  )
}

export function LoadingPanel() {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <span className="sr-only">Consultando el tiempo…</span>
      <div className="skeleton__head">
        <div className="skeleton__line skeleton__line--place" />
        <div className="skeleton__line skeleton__line--meta" />
      </div>
      <div className="skeleton__figure">
        <div className="skeleton__block skeleton__block--glyph" />
        <div className="skeleton__line skeleton__line--temp" />
      </div>
      <div className="skeleton__band" />
    </div>
  )
}
