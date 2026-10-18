import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { url: 'https://tecdigital.tec.ac.cr/tdplus/' } },
    include: ['test/**/*.test.ts'],
  },
});
