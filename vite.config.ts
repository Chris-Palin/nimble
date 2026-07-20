import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Platform uplift, phase 2: the static site in public/ still passes through
// verbatim. The React shell (Arabella. sidebar + home) builds at /app/ and
// takes over /studio/ once it reaches parity; tools keep shipping untouched.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@ui': resolve(__dirname, 'src/ui') } },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { app: resolve(__dirname, 'app/index.html') },
    },
  },
});
