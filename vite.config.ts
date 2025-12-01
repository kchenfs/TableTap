import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CLOUD FIX: We cannot bake the table ID into the base path anymore.
// We set it to root '/' so this single image works for ANY table URL.
export default defineConfig({
  plugins: [react()],
  base: '/', 
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});