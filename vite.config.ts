import { defineConfig } from 'vite';

// Phase 1 of the platform uplift: the existing static site lives in public/
// and passes through the build verbatim, so deploys are byte-identical to
// the pre-Vite site. React app entries (shell, home, Stage) land in src/
// as phase 2 and get bundled alongside it.
export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { seed: 'src/main.ts' },
    },
  },
});
