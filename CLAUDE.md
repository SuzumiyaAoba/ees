# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
- `nix-shell` - Enter development environment with all dependencies (Node.js 20, libSQL, Ollama, etc.)
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

**Dual API Implementation**:
- `src/index.ts` - Traditional Hono API with try/catch error handling
- `src/index-effect.ts` - Effect-based API with functional programming paradigm

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

**Nix Shell**:
- Provides reproducible development environment
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