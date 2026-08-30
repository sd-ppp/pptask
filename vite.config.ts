import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'core/src/index.ts'),
        contracts: resolve(import.meta.dirname, 'core/src/contracts.ts'),
        registry: resolve(import.meta.dirname, 'core/src/registry.ts'),
        builtins: resolve(import.meta.dirname, 'core/src/builtins.ts'),
        'executors/inline': resolve(import.meta.dirname, 'executors/inline/src/index.ts'),
        'locator-catalog': resolve(import.meta.dirname, 'core/src/locator-catalog.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => {
        // Keep the directory structure for inline executor
        return `${entryName}.js`;
      },
    },
    outDir: 'dist',
    sourcemap: true,
    rolldownOptions: {
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
