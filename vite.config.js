import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_APP_BASE_PATH || '/';

  return {
    plugins: [react()],
    base,
    server: {
      open: true,
      host: '0.0.0.0',
      port: 6005,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5006',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    }
  };
});
