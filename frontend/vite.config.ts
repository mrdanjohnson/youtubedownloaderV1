import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'localhost',
      '.newdaychurch.cc',
      '.local',
    ],
    // Disable HMR completely (stops WebSocket errors through reverse proxy)
    hmr: false,
    // Proxy API requests to backend container
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
        secure: false,
        // Preserve request body for POST/PUT requests
        ws: true,
      },
      '/health': {
        target: 'http://backend:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
