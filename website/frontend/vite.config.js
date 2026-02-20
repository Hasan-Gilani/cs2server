import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://16.24.36.253',
      '/auth': 'http://16.24.36.253',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
