# Build System

This package uses Vite to build TypeScript source code into JavaScript for distribution.

## Build Commands

```bash
# Build the package (compile TS → JS)
pnpm run build

# Watch mode for development
pnpm run dev

# Run tests (uses TypeScript source directly)
pnpm run test
```

## Build Output

The build process:

1. **Vite** compiles TypeScript to JavaScript:
   - `core/src/index.ts` → `dist/index.js`
   - `executors/inline/src/index.ts` → `dist/executors/inline.js`

2. **TypeScript Compiler** generates type declarations:
   - `dist/core/src/**/*.d.ts` - Type definitions for core
   - `dist/executors/inline/src/**/*.d.ts` - Type definitions for executors

## Package Exports

The package exports two entry points:

```javascript
// Main entry point
import { describeResource, createTask, ... } from '@sdppp/pptask';

// Inline executor
import { createInlineExecutor } from '@sdppp/pptask/executors/inline';
```

## Development vs Production

- **Development**: Tests and local imports use TypeScript source files directly
- **Production**: External consumers use the compiled JavaScript in `dist/`

## File Structure

```
.
├── core/src/              # Source code
├── executors/inline/src/  # Executor source code
├── dist/                  # Compiled output (gitignored)
│   ├── index.js          # Main bundle
│   ├── executors/
│   │   └── inline.js     # Inline executor bundle
│   ├── core/src/         # Type declarations
│   └── executors/        # Executor type declarations
├── docs/BUILD.md         # Build documentation
├── scripts/test-build.mjs # Built-package smoke test
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript config for development
└── tsconfig.build.json   # TypeScript config for production build
```

## Configuration Files

### vite.config.ts
Configures the JavaScript build:
- Entry points
- Output format (ESM)
- External dependencies
- Source maps

### tsconfig.build.json
Configures TypeScript declaration generation:
- Excludes test files
- Generates .d.ts files
- Source maps for declarations

## Testing

Tests continue to use TypeScript source files directly through Vitest, so no build step is required for testing.

```bash
pnpm test                        # Run all tests
pnpm test runninghub-api.test.ts # Run specific test
pnpm run test:build              # Build and smoke-test package exports
```
