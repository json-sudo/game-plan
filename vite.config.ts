/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [fileURLToPath(new URL('./src/shared/styles', import.meta.url))] },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/data/**/*.ts',
        'src/engine/**/*.ts',
        'src/persistence/**/*.ts',
        'src/share/**/*.ts',
        'src/state/**/*.ts',
        'src/shared/hooks/**/*.ts',
        'src/ui/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        'src/persistence/fixtures.ts',
        'src/persistence/types.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
