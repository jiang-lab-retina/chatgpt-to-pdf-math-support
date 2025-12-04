import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';

// CRXJS requires manifest to be imported as default export
import manifest from './src/manifest.json' with { type: 'json' };

export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, 'public'),
  plugins: [
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@exporters': resolve(__dirname, 'src/exporters'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production',
    chunkSizeWarningLimit: 600, // jsPDF is large
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
