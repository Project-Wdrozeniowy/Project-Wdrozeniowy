import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
    proxy: {
      '^/api(?:/|$)': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '^/ws(?:/|$)': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true },
    },
  },
});
