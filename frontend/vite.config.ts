import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev:     VITE_MOCK_API_URL points to mock-api or backend container
// In preview: VITE_BACKEND_URL points to the deployed backend (Render)
const backendUrl = process.env['VITE_BACKEND_URL'] ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env['VITE_MOCK_API_URL'] ?? backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env['PORT'] ?? '4173'),
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
