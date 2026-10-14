import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => os caminhos dos assets ficam relativos, necessário para abrir
// o index.html via file:// dentro do Electron empacotado.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
