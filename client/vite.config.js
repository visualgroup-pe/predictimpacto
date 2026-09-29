import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El cliente nunca accede a MongoDB: todas las lecturas pasan por la API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_URL || 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
