/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VISUAL_CROSSING_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
