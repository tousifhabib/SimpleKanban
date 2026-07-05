import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    env: {
      // Deterministic date math (gantt ranges, aging) regardless of the
      // machine's timezone and DST boundaries.
      TZ: 'UTC',
    },
  },
});
