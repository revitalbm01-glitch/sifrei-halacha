import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative paths so the site works under any GitHub Pages sub-path
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
