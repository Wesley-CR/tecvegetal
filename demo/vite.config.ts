import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

// Build de demo: la app real con la capa de red reemplazada por datos sintéticos.
export default defineConfig({
  root: __dirname,
  plugins: [
    svelte({ compilerOptions: { css: 'injected' } }),
    {
      name: 'mock-net',
      enforce: 'pre',
      resolveId(id, importer) {
        if (importer && /data[\\/]/.test(importer) && /^\.\/net(\.ts)?$/.test(id)) return path.resolve(__dirname, 'net-mock.ts');
        return null;
      },
    },
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: { entry: path.resolve(__dirname, 'main.ts'), formats: ['iife'], name: 'TDDemo', fileName: () => 'demo.js' },
  },
});
