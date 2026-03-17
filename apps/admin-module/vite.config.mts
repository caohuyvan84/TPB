/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/admin-module',
  server: {
    port: 3020,
    host: '0.0.0.0',
  },
  preview: {
    port: 3020,
    host: '0.0.0.0',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  build: {
    outDir: '../../dist/apps/admin-module',
    emptyOutDir: true,
    reportCompressedSize: true,
    rollupOptions: {
      input: './index.html',
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'admin-module',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/admin-module',
      provider: 'v8' as const,
    },
  },
}));
