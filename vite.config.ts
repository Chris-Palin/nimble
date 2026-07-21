import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Platform uplift, phase 2: the static site in public/ still passes through
// verbatim. The React shell (Arabella. sidebar + home) builds at /app/ and
// takes over /studio/ once it reaches parity; tools keep shipping untouched.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'src/ui'),
      '@arabella/ui': resolve(__dirname, 'packages/ui/src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        poem: resolve(__dirname, 'poem.html'),
        arabella: resolve(__dirname, 'arabella/index.html'),
        stage: resolve(__dirname, 'arabella/stage.html'),
        motion: resolve(__dirname, 'arabella/motion.html'),
        stipple: resolve(__dirname, 'arabella/stipple.html'),
        mash: resolve(__dirname, 'arabella/mash.html'),
        digit: resolve(__dirname, 'arabella/digit.html'),
      },
    },
  },
});
