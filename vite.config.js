import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    allowedHosts: [
      'translation-app-frontend-lhk5.onrender.com',
      '.onrender.com', // Allow all Render subdomains
      'localhost',
      'https://translate-any-pdf.onrender.com'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173'),
    allowedHosts: [
      'translation-app-frontend-lhk5.onrender.com',
      '.onrender.com',
      'localhost'
    ],
  }
})