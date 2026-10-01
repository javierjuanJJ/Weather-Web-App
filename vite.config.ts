import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Handy for testing the geolocation default from a phone on the LAN.
    host: true,
  },
})