# Nx Monorepo Setup Instructions

## Current Status

✅ **Completed:**
- Git repository structure prepared (.gitignore created)
- Nx configuration files created (nx.json, tsconfig.base.json)
- Directory structure created (apps/, services/, packages/, libs/, infra/)
- Existing src/ backed up to src.backup/
- Existing src/ moved to apps/agent-desktop/src/
- index.html and vite.config.ts moved to apps/agent-desktop/

## Next Steps (Requires npm/node)

### 1. Install Nx and Dependencies

```bash
# Install Nx globally (optional but recommended)
npm install -g nx@latest

# Install Nx as dev dependency
npm install -D nx@latest @nx/vite@latest @nx/react@latest @nx/js@latest @nx/nest@latest

# Install workspace dependencies
npm install -D @nx/workspace@latest @nx/eslint-plugin@latest
```

### 2. Update Root package.json

The root package.json needs to be updated to support the monorepo structure:

```json
{
  "name": "tpb-crm-platform",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*",
    "libs/*"
  ],
  "scripts": {
    "dev": "nx serve agent-desktop",
    "build": "nx build agent-desktop",
    "test": "nx test",
    "lint": "nx lint",
    "affected:build": "nx affected --target=build",
    "affected:test": "nx affected --target=test",
    "affected:lint": "nx affected --target=lint"
  },
  "devDependencies": {
    "nx": "^22.0.0",
    "@nx/vite": "^22.0.0",
    "@nx/react": "^22.0.0",
    "@nx/js": "^22.0.0",
    "@nx/nest": "^22.0.0",
    "@nx/workspace": "^22.0.0",
    "@nx/eslint-plugin": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 3. Configure agent-desktop Project

Create `apps/agent-desktop/project.json`:

```json
{
  "name": "agent-desktop",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/agent-desktop/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/agent-desktop"
      }
    },
    "serve": {
      "executor": "@nx/vite:dev-server",
      "options": {
        "buildTarget": "agent-desktop:build",
        "port": 3000
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    },
    "test": {
      "executor": "@nx/vite:test"
    }
  },
  "tags": ["type:app", "scope:frontend"]
}
```

### 4. Update agent-desktop vite.config.ts

The vite.config.ts in apps/agent-desktop/ needs to be updated for the monorepo:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: '../../dist/apps/agent-desktop',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
  },
});
```

### 5. Create agent-desktop tsconfig.json

Create `apps/agent-desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "allowJs": false,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022",
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "files": [],
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "references": [
    {
      "path": "./tsconfig.app.json"
    }
  ]
}
```

### 6. Run Installation

```bash
# Install all dependencies
npm install

# Verify Nx is working
nx --version

# Build agent-desktop to verify setup
nx build agent-desktop

# Start development server
nx serve agent-desktop
```

## Task 1.2 Completion Criteria

✅ Nx workspace initialized with integrated preset
✅ Workspace name configured as "tpb-crm-platform"
✅ npm package manager configured
✅ Directory structure matches spec requirements

## Next Task: 1.3 - React 19 Upgrade

After completing the Nx setup, proceed with:
- Upgrading React 18 to React 19.2.x
- Updating all React-dependent packages
- Testing for React 19 breaking changes

## Notes

- The monorepo structure is ready but requires npm to install dependencies
- All configuration files follow Nx 22.x (2026) best practices
- TypeScript strict mode is enabled across the workspace
- Path aliases are configured for clean imports
