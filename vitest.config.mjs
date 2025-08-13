import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node20'
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  }
});