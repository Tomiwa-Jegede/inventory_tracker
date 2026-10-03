import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Local dev only: where the Vite proxy forwards /api. Production
  // (Cloudflare Pages) uses VITE_API_URL baked in at build time instead —
  // there is no same-origin proxy there.
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': devApiTarget,
      },
    },
  };
});
