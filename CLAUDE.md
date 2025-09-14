# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Node.js library built with Hono web framework, featuring modern development tooling and strict type safety. The project builds as both ES modules and CommonJS library output.

## Quick Setup

### Using Nix (Recommended)
```bash
nix-shell
```
This will automatically:
- Install Node.js 20 and required development tools
- Install npm dependencies if needed
- Setup git hooks with Husky
- Display available commands

### Manual Setup
Ensure you have Node.js 18+ installed, then:
```bash
npm install
npm run prepare  # Setup git hooks
```

## Development Commands

### Core Development
- `npm run dev` - Start development server using Vite
- `npm run build` - Build library for production (ES + CJS formats)
- `npm start` - Run the built application
- `npm run preview` - Preview the built application

### Testing
- `npm test` - Run tests in watch mode with Vitest
- `npm run test:run` - Run tests once and exit

### Code Quality
- `npm run format` - Format all code using Biome
- `npm run lint` - Lint all code using Biome
- `npm run type-check` - Run TypeScript type checking without emitting files

All format and lint commands use `npm-run-all2` to run multiple tasks sequentially (`run-s format:*`, `run-s lint:*`).

## Architecture & Key Technologies

### Core Stack
- **Hono**: Lightweight web framework for the HTTP server
- **Zod**: Runtime type validation and schema definition
- **TypeScript**: Configured with `@tsconfig/strictest` for maximum type safety
- **Vite**: Build tool configured for Node.js library builds

### Development Tools
- **Biome**: Unified formatter, linter, and import organizer (replaces Prettier + ESLint)
- **Vitest**: Testing framework with Node.js environment
- **Husky + lint-staged**: Pre-commit hooks for code quality

### Project Structure
```
src/
├── index.ts          # Main Hono app export
├── schemas/          # Zod validation schemas
│   └── user.ts       # User-related schemas
├── __tests__/        # Test files
└── types/            # TypeScript type definitions
```

## Build Configuration

### Vite (vite.config.ts)
- Builds as Node.js library with ES modules and CommonJS outputs
- External dependencies: `hono`, `zod` (not bundled)
- Target: Node.js 18+
- No minification for library builds

### TypeScript
- Extends `@tsconfig/strictest` for maximum type safety
- Module resolution: `bundler` (Vite-compatible)
- Outputs to `dist/` with declarations and source maps
- Includes `@total-typescript/ts-reset` for improved built-in types

### Code Quality
- **Biome**: Configured for 2-space indentation, 80-char line width, double quotes
- **Pre-commit hooks**: Auto-format with Biome + TypeScript type checking
- **lint-staged**: Uses `.lintstagedrc.json` (not package.json config due to node_modules conflicts)

## Key Patterns

### Schema Validation
All API endpoints use Zod schemas for request validation:
```typescript
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0, 'Age must be positive').optional(),
})
```

### Hono Route Structure
Routes follow pattern of schema validation + JSON responses:
```typescript
app.post('/users', async (c) => {
  try {
    const body = await c.req.json()
    const user = CreateUserSchema.parse(body)
    return c.json({ message: 'User created', user })
  } catch (error) {
    return c.json({ error: 'Invalid request data' }, 400)
  }
})
```

## Testing

- Tests use Vitest with global APIs enabled
- Test files in `src/__tests__/` directory
- Both unit tests for schemas and integration tests for Hono app
- Node.js environment for testing

## Notes

- Uses `ts-reset` to improve TypeScript's built-in types
- Git hooks prevent commits with formatting/type errors
- Library builds to both ES modules and CommonJS for compatibility
- Biome handles all formatting, linting, and import organization in a single tool