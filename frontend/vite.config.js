import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        proxyTimeout: 180000,   // OCR + LLM calls can take a while on first run
        timeout: 180000,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('proxy err', err.message))
        },
      }
    }
  }
})

