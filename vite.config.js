import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/',
  }

  // Base path is root for Vercel
  config.base = '/'

  config.server = {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    }
  }

  return config
})
