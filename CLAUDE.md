# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup

**Nix Flakes (Recommended):**
- `nix develop` - Enter development environment with all dependencies (Node.js 20, Ollama, SQLite, etc.)
- `nix run` - Build and run the EES API server directly
- `nix run .#dev` - Start development server with hot reload
- `nix build` - Build the EES application package

**Legacy Nix:**
- `nix-shell` - Enter development environment using shell.nix
- The shell.nix automatically starts Ollama service and sets up the development environment

### Core Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production using Vite
- `npm start` - Run production build
- `npm test` - Run tests with Vitest (watch mode)
- `npm run test:run` - Run tests once

### Code Quality
- `npm run lint` - Check code with Biome linter
- `npm run format` - Format code with Biome
- `npm run type-check` - TypeScript type checking without emitting files

### Git Workflow
Before developing:
1. Ensure you're on the correct branch (check current branch name)
2. If not appropriate, checkout to `main` and pull latest changes
3. Create/checkout appropriate feature branch before development

## Architecture Overview

### Technology Stack
- **Framework**: Hono (lightweight web framework)
- **Runtime**: Node.js with TypeScript
- **Database**: libSQL with Drizzle ORM for type safety
- **AI/ML**: Ollama for local embedding generation (default model: `embeddinggemma:300m`)
- **Functional Programming**: Effect library for composable, type-safe operations
- **Validation**: Zod schemas for runtime type checking
- **Testing**: Vitest with Node.js environment
- **Build**: Vite configured for Node.js library builds

### Application Architecture

**Effect-based API Implementation**:
- `src/index.ts` - Effect-based Hono API with functional programming paradigm and type-safe error handling

**Effect-based Service Layer**:
- `src/services/database.ts` - Database connection with Effect wrappers
- `src/services/ollama-effect.ts` - Ollama integration with Effect error handling
- `src/services/embedding-effect.ts` - Core embedding business logic
- `src/layers/main.ts` - Effect dependency injection layer composition

**Error Handling**:
- Tagged error types in `src/errors/` for domain-specific error handling
- `DatabaseError`, `DatabaseConnectionError`, `DatabaseQueryError`
- `OllamaError`, `OllamaConnectionError`, `OllamaModelError`

**Data Layer**:
- `src/database/schema.ts` - Drizzle ORM schema definitions
- Database uses libSQL with automatic schema initialization
- Test environment uses in-memory database (`:memory:`)

### API Endpoints

**Embeddings API**:
- `POST /embeddings` - Create embedding from text
- `GET /embeddings` - List all embeddings
- `GET /embeddings/:filePath` - Get embedding by file path
- `DELETE /embeddings/:id` - Delete embedding by ID

**Request/Response Types**:
- Input validation via Zod schemas in `src/schemas/`
- Type definitions in `src/types/embedding.ts`

### Development Environment

**Nix Flakes**:
- Modern, declarative approach for reproducible environments
- Provides isolated development shell with all dependencies
- Automatic Ollama service startup and data directory creation
- Cross-platform support (Linux, macOS)
- Lock file ensures reproducible builds across machines

**Legacy Nix Shell**:
- Traditional shell.nix for compatibility
- Auto-installs dependencies and sets up git hooks
- Starts Ollama service automatically
- Creates data directory for libSQL

**Code Quality Tools**:
- Biome for formatting and linting (replaces Prettier + ESLint)
- Husky + lint-staged for pre-commit hooks
- TypeScript with strictest configuration

### Effect Programming Patterns

**Service Dependencies**:
```typescript
const program = Effect.gen(function* () {
  const embeddingService = yield* EmbeddingService
  return yield* embeddingService.createEmbedding(filePath, text, modelName)
})

const result = await Effect.runPromise(
  program.pipe(Effect.provide(AppLayer))
)
```

**Error Handling**:
- Use tagged errors for domain-specific failures
- Compose error types in Effect signatures
- Use `Effect.tryPromise` for async operations that may fail

**Testing Strategy**:
- Tests run with NODE_ENV=test for in-memory database
- Vitest configured for Node.js environment
- Effect programs can be tested in isolation using mock layers

## Quick Start with Nix Flakes

### Prerequisites
- Nix package manager with flakes enabled
- Git

### Getting Started

1. **Clone and enter development environment:**
   ```bash
   git clone <repository-url>
   cd ees
   nix develop
   ```

2. **Run API server directly:**
   ```bash
   nix run
   ```

3. **Start development server:**
   ```bash
   nix run .#dev
   ```

4. **Build the application:**
   ```bash
   nix build
   ```

### Flake Outputs

- `packages.default` - EES application package
- `packages.server` - Production server script with dependencies
- `apps.default` - Run the API server
- `apps.dev` - Development server with hot reload
- `devShells.default` - Development environment with all tools

### Benefits

- **Zero-config setup**: No need to install Node.js, Ollama, or other dependencies
- **Reproducible builds**: Lock file ensures identical environments across machines
- **Isolated environment**: No conflicts with system packages
- **Cross-platform**: Works on Linux and macOS
- **Easy deployment**: Built packages can be deployed anywhere Nix is available