import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: Vite serves the SPA on :5173 and proxies /api to the Express server on :8080.
// `host: true` binds 0.0.0.0 so a phone on the LAN can reach the dev server too.
// Prod: `npm run build` emits dist/client, which the Express process serves itself.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
