import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// This config is for LOCAL development (not Docker)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // Different port for local development
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001',  // Connect to local backend
    },
  },
})
