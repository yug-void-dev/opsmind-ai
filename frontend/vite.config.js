import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
<<<<<<< HEAD
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
=======
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
>>>>>>> d2edd9f1d4444e8172e5ae18061a76c26fd07a48
      },
    },
  },
})
