/**
 * Geometría de la banda horaria. Las cifras se comparten entre el SVG y la
 * columna de etiquetas (que es HTML), así que viven aquí para que ambas piezas
 * midan exactamente lo mismo.
 */

export const CELL = 21
export const HOURS = 49
export const WINDOW_FALLBACK_INDEX = 24
export const PLOT_LEFT = 2
export const PAD_RIGHT = 42

export const SKY = { top: 28, height: 20 }
export const TEMP = { top: 58, height: 156 }
export const AXIS = { top: TEMP.top + TEMP.height + 8, height: 30 }
export const RAIN = { top: AXIS.top + AXIS.height + 18, height: 38 }
export const WIND = { top: RAIN.top + RAIN.height + 16, height: 20 }

export const PLOT_WIDTH = HOURS * CELL
export const INNER_WIDTH = PLOT_LEFT + PLOT_WIDTH + PAD_RIGHT
export const TOTAL_HEIGHT = WIND.top + WIND.height + 8

/** Centro de la columna `index` dentro del SVG. */
export function xAt(index: number): number {
  return PLOT_LEFT + index * CELL + CELL / 2
}

/** Columna más cercana a una posición horizontal del SVG. */
export function indexAt(x: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round((x - PLOT_LEFT - CELL / 2) / CELL)))
}
