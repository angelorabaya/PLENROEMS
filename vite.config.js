import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('@tremor') || id.includes('recharts')) {
            return 'charts-vendor';
          }

          if (id.includes('docx') || id.includes('file-saver')) {
            return 'export-vendor';
          }

          if (id.includes('@radix-ui')) {
            return 'radix-vendor';
          }

          if (id.includes('react-icons')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
  server: {
    open: true,
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  }
}));
