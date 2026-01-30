import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'core/src/index.ts'),
        'executors/inline': resolve(__dirname, 'executors/inline/src/index.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => {
        // Keep the directory structure for inline executor
        return `${entryName}.js`;
      },
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [
        '@google/genai',
        'dotenv',
        'replicate',
        'zod',
        /^node:.*/,
      ],
      output: {
        preserveModules: false,
        exports: 'named',
      },
    },
    minify: false,
    target: 'es2020',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
