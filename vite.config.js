import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]react(?:-dom)?[\\/]/.test(id) || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('firebase/storage') || id.includes('@firebase/storage')) return 'vendor-firebase-storage';
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'vendor-firebase-firestore';
          if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-auth';
          if (id.includes('firebase')) return 'vendor-firebase-core';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('lucide-react') || id.includes('@radix-ui')) return 'vendor-ui';
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
          if (id.includes('leaflet') || id.includes('google-maps') || id.includes('pusher')) return 'vendor-network';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
