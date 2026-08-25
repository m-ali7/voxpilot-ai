import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Serve backend media same-origin so HTMLAudioElement + MediaElementSource
      // analysis is CORS-clean in development. In production a reverse proxy
      // (nginx) routes /media to the backend the same way.
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
