import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get the app mode and table ID from environment variables
const appMode = process.env.VITE_APP_MODE || 'dine-in';
const tableId = process.env.VITE_TABLE_ID || 'table-1';

// Determine the base path
// For dine-in, use /table-X/ as the base
// For takeout, use / as the base
const base = appMode === 'dine-in' ? `/${tableId}/` : '/';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
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