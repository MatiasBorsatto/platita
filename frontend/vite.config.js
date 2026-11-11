import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // Por defecto usa el backend expuesto con ngrok. Para un backend local: API_URL=http://localhost:3000 npm run dev
    proxy: {
      '/api': {
        target: process.env.API_URL || 'https://touched-woodcock-upright.ngrok-free.app',
        changeOrigin: true,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: false
  }
})
