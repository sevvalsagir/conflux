import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    // react-dom alone is ~130 kB minified; combined with React 18 internals
    // the renderer chunk is legitimately large — 1000 kB is a realistic ceiling
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split react-dom (heavy renderer) from the lighter react + router
          'vendor-react-dom':    ['react-dom'],
          'vendor-react-router': ['react', 'react-router-dom'],
          'vendor-store':        ['zustand'],
          'vendor-http':         ['axios'],
          'vendor-utils':        ['clsx'],
        },
      },
    },
  },
})
