import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  onSearch: (place: string) => void
  onLocate: () => void
  onRefresh: () => void
  busy: boolean
  disabled: boolean
}

export function SearchBar({ onSearch, onLocate, onRefresh, busy, disabled }: Props) {
  const [place, setPlace] = useState('')
  const reduceMotion = useReducedMotion()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = place.trim()
    if (trimmed === '') return
    onSearch(trimmed)
    setPlace('')
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="place">
        Lugar
      </label>
      <input
        id="place"
        className="search__input"
        type="search"
        name="place"
        autoComplete="off"
        placeholder="Ciudad, dirección o código postal"
        value={place}
        disabled={disabled}
        onChange={(event) => {
          setPlace(event.target.value)
        }}
      />
      <button className="btn btn--primary" type="submit" disabled={disabled || place.trim() === ''}>
        Buscar
      </button>
      <button className="btn btn--ghost" type="button" onClick={onLocate} disabled={disabled}>
        Mi ubicación
      </button>
      <motion.button
        className="btn btn--icon"
        type="button"
        onClick={onRefresh}
        disabled={disabled || busy}
        aria-label="Actualizar"
        title="Actualizar"
        {...(reduceMotion ? {} : { whileTap: { scale: 0.94 } })}
        animate={busy && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
        transition={
          busy && !reduceMotion
            ? { repeat: Infinity, duration: 1.1, ease: 'linear' }
            : { duration: 0.25 }
        }
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M16.4 10a6.4 6.4 0 1 1-1.9-4.5" />
            <path d="M16.8 3.4v3.4h-3.4" />
          </g>
        </svg>
      </motion.button>
    </form>
  )
}
