import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_API_URL = full backend URL (e.g. https://langlearn-backend.onrender.com)
// api.js will append /api to this
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
