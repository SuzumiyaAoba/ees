# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Standards

**Important**: All documentation, comments, and user-facing text must be written in English only. This includes:
- README files and all documentation
- API documentation and examples
- Code comments and inline documentation
- Commit messages and PR descriptions
- Error messages and log messages
- User interface text and console output
- Example scripts and test files
- Configuration files and templates

The only exceptions are:
- Test data for internationalization/localization features (e.g., Japanese text samples for embedding tests)
- User-provided content in API requests/responses
- Third-party dependencies or external resources

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
- `npm run dev` - Start development server for API package
- `npm run dev:web` - Start development server for web frontend
- `npm run build` - Build all packages (core, cli, api, web)
- `npm start` - Run production build
- `npm test` - Run tests across all workspaces (watch mode)
- `npm run test:run` - Run tests once across all workspaces

### Code Quality
- `npm run lint` - Check code with Biome linter
- `npm run format` - Format code with Biome
- `npm run type-check` - TypeScript type checking without emitting files

**MANDATORY QUALITY CHECKS**: After any implementation or code change, you MUST run `npm run type-check` and `npm run lint` to ensure no errors exist. If errors occur, fix the problematic parts before proceeding or committing changes. This is a strict requirement for all development work.

### Per-Package Commands
- `npm run build --workspace=@ees/core` - Build core package only
- `npm run test --workspace=@ees/cli` - Test CLI package only
- `npm run dev --workspace=@ees/api` - Start API server in development mode
- `npm run dev --workspace=packages/web` - Start web frontend in development mode

### Testing Commands
- `npm test` - Run all tests in watch mode across workspaces
- `npm run test:run` - Run all tests once (CI mode)
- `npm run test --workspace=@ees/core` - Run core package tests only
- `npm run test --workspace=@ees/api` - Run API package tests only
- `npm run test:watch --workspace=@ees/core` - Run core tests in watch mode

## Code Quality Standards

### Import Path Standards

**MANDATORY**: All imports must use the `@/` path alias format instead of relative paths (like `../` or `../../`).

**Required Import Style:**
```typescript
// ✅ Correct - Use @/ path alias
import { EmbeddingService } from "@/entities/embedding/api/embedding"
import { DatabaseService } from "@/shared/database/database-service"
import { ProviderModelError } from "@/shared/providers/types"

// ❌ Incorrect - Relative paths not allowed
import { EmbeddingService } from "../api/embedding"
import { DatabaseService } from "../../../shared/database/database-service"
import { ProviderModelError } from "../types"
```

**Path Mapping Configuration:**
- The `@/` alias maps to `packages/core/src/` for the core package
- This is configured in `tsconfig.json` with `"@/*": ["./*"]` under `paths`
- All test files, implementation files, and modules must follow this convention

**Benefits:**
- **Consistency**: Uniform import style across the entire codebase
- **Maintainability**: Easier to refactor and move files without breaking imports
- **Readability**: Clear indication of module location without relative path complexity
- **IDE Support**: Better autocomplete and navigation with absolute paths

**Enforcement:**
- All new code must use `@/` imports exclusively
- When editing existing files, convert relative imports to `@/` format
- Code reviews should reject PRs with relative import paths

### TypeScript Type Safety Policy

**MANDATORY**: The use of `any` type is strictly prohibited in all production code.

**Type Safety Requirements**:
- **NO `any` types** in production code - use proper TypeScript types
- Use union types, generics, or `unknown` instead of `any`
- Define proper interfaces and types for all data structures
- Use type assertions only when absolutely necessary with proper type guards
- Prefer type-safe alternatives like `Record<string, unknown>` over `any`

**Acceptable Alternatives to `any`**:
```typescript
// ✅ Use specific types
interface UserData {
  name: string
  age: number
}

// ✅ Use generics
function process<T>(data: T): T {
  return data
}

// ✅ Use unknown for truly unknown data
function parseJson(json: string): unknown {
  return JSON.parse(json)
}

// ✅ Use union types
type Status = "pending" | "completed" | "failed"

// ❌ Never use any
function badFunction(data: any): any {
  return data
}
```

**Exception**: The `any` type is only permitted in test files under `src/__tests__/**/*` where mocking or testing scenarios require it.

### Biome Configuration Policy

**IMPORTANT**: The `biome.json` configuration file is strictly protected and MUST NOT be edited by Claude Code.

**Prohibited Actions**:
- Editing `biome.json` to relax linting rules for specific files
- Adding file-specific overrides to disable linting errors
- Modifying Biome configuration to accommodate code quality issues

**Required Approach**:
- Fix all linting errors by improving the code quality, not by relaxing rules
- Use proper TypeScript types instead of `any` (see TypeScript Type Safety Policy above)
- Follow established patterns and best practices
- Maintain consistent code quality standards across the entire codebase

**Exception**: The existing test file override for `src/__tests__/**/*` is permitted as testing code has different requirements for `any` types and unused variables.

If you encounter linting errors, you MUST fix the underlying code issues rather than modifying the Biome configuration. This ensures consistent code quality and maintainability across the project.

### Git Workflow
Before developing:
1. Ensure you're on the correct branch (check current branch name)
2. If not appropriate, checkout to `main` and pull latest changes
3. Create/checkout appropriate feature branch before development

### Pull Request and CI Workflow
After creating a PR:
1. **Always check CI status** - PRs must pass all CI checks before merging
2. **Monitor CI results** - Use `gh pr checks <PR_NUMBER>` to check CI status
3. **Fix failing CI** - If CI fails, investigate and fix issues immediately:
   - For linting errors: Run `npm run lint` locally and fix issues
   - For type errors: Run `npm run type-check` and resolve TypeScript issues
   - For test failures: Run `npm run test:run` and fix failing tests
   - For formatting issues: Run `npm run format` to auto-format code
   - For security vulnerabilities: Run `npm audit` and update dependencies
4. **View detailed CI logs** - Use `gh run view <RUN_ID> --log-failed` for detailed error information
5. **Re-run CI after fixes** - Push fixes to automatically trigger new CI run

**CI Pipeline Structure:**
- **test**: Main testing pipeline (linting, type-checking, testing, building)
- **nix-build**: Nix package build verification
- **format-check**: Code formatting verification
- **security**: Security audit and vulnerability scanning

**Never merge PRs with failing CI** - All checks must be green before merging.

## Testing Requirements

### Unit Testing Policy
**Mandatory Testing Rule**: After implementing any new feature or functionality, unit tests MUST be added to ensure code quality and prevent regressions.

### Test-Driven Development (TDD) for Bug Fixes

**MANDATORY**: When fixing bugs, you MUST follow Test-Driven Development practices:

1. **Write Failing Test First** - Before making any code changes, implement a unit test that reproduces the bug
2. **Verify Test Failure** - Run the test to confirm it fails due to the bug
3. **Fix the Bug** - Make minimal code changes to fix the issue
4. **Verify Test Passes** - Confirm the test now passes with the fix
5. **Refactor if Needed** - Improve code quality while keeping tests green

**TDD Workflow Example:**
```typescript
// 1. Write failing test
describe("Bug fix: user creation with invalid email", () => {
  it("should throw ValidationError for invalid email format", () => {
    expect(() => createUser({ email: "invalid-email" }))
      .toThrow(ValidationError)
  })
})

// 2. Run test - should FAIL
// 3. Fix the bug in createUser function
// 4. Run test - should PASS
// 5. Refactor if needed
```

**Benefits of TDD for Bug Fixes:**
- **Prevents regression** - Ensures the same bug doesn't reoccur
- **Documents the bug** - Test serves as documentation of the issue
- **Validates the fix** - Confirms the solution actually resolves the problem
- **Improves confidence** - Provides safety net for future changes

**When to Add Tests:**
1. **New API endpoints** - Add comprehensive tests covering success cases, error cases, validation, and edge cases
2. **New service methods** - Test all public methods with various inputs and error conditions
3. **New business logic** - Cover all code paths including happy path and error scenarios
4. **Bug fixes** - **MUST follow TDD approach** - Write failing test first, then fix
5. **Feature enhancements** - Update existing tests and add new ones for new functionality

**Test Coverage Requirements:**
- All new public methods must have corresponding unit tests
- Critical business logic must achieve >90% test coverage
- Error handling and edge cases must be explicitly tested
- Integration tests should be added for complex workflows

**Test Structure:**
- Tests are located in `__tests__/` directories within each package
- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Include both positive and negative test cases
- Mock external dependencies appropriately

**Running Tests:**
- `npm test` - Run tests in watch mode during development
- `npm run test:run` - Run tests once (used in CI)
- Tests must pass before committing any code
- CI will automatically run all tests on every PR

**Test Examples:**
```typescript
describe("PaginationService", () => {
  it("should return correct pagination metadata for valid page and limit", async () => {
    // Test implementation
  })

  it("should enforce maximum limit of 100 items per page", async () => {
    // Test implementation
  })

  it("should handle empty results gracefully", async () => {
    // Test implementation
  })
})
```

### Testing Tools and Framework
- **Test Runner**: Vitest with Node.js environment
- **Mocking**: Vitest built-in mocking capabilities
- **Effect Testing**: Mock layers for testing Effect-based services
- **API Testing**: In-memory testing with mocked dependencies

## Architecture Overview

### Technology Stack
- **Framework**: Hono (lightweight web framework)
- **Runtime**: Node.js with TypeScript
- **Database**: libSQL with Drizzle ORM for type safety
- **AI/ML**: Multi-provider embedding system via Vercel AI SDK (Ollama, OpenAI, Google AI, Cohere, Mistral, Azure OpenAI)
- **Default Provider**: Ollama with `nomic-embed-text` model
- **Functional Programming**: Effect library for composable, type-safe operations
- **Validation**: Zod schemas for runtime type checking
- **Testing**: Vitest with Node.js environment
- **Build**: Vite for API, TypeScript for other packages
- **Code Quality**: Biome for linting and formatting
- **Monorepo**: npm workspaces

### Monorepo Structure

**Packages:**
- `packages/core` - Shared business logic, types, database layer, and providers
- `packages/api` - REST API server using Hono framework
- `packages/cli` - Command-line interface using Citty
- `packages/web` - Web frontend (React/Vite)

**Key Directories:**
- `packages/core/src/shared/` - Shared utilities, database, config, providers
- `packages/core/src/entities/embedding/` - Core embedding business logic
- `packages/api/src/` - API routes, middleware, server setup
- `packages/cli/src/` - CLI commands and interface
- `packages/web/src/` - React web frontend components

### Multi-Provider AI Architecture

The system supports multiple embedding providers through a unified interface:

**Supported Providers:**
- **Ollama** (default) - Local embeddings with `nomic-embed-text`
- **OpenAI** - `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
- **Google AI** - `embedding-001`, `text-embedding-004`
- **Cohere** - `embed-english-v3.0`, `embed-multilingual-v3.0`
- **Mistral** - `mistral-embed`
- **Azure OpenAI** - Compatible with OpenAI models via Azure endpoints

**Provider Implementation:**
- Each provider in `packages/core/src/shared/providers/` implements a common `EmbeddingProvider` interface
- Uses Vercel AI SDK with `createOpenAI`, `createCohere`, etc. factory functions
- Unified error handling with tagged error types
- Configuration through environment variables with `EES_` prefix

### Effect-based Architecture

The codebase uses Effect-ts for functional programming with composable, type-safe operations:

**Error Handling:**
- Tagged error types for domain-specific failures
- `DatabaseError`, `DatabaseConnectionError`, `DatabaseQueryError`
- `ProviderError`, `ProviderConnectionError`, `ProviderModelError`, `ProviderAuthenticationError`, `ProviderRateLimitError`
- Compose error types in Effect signatures
- Use `Effect.tryPromise` for async operations that may fail

**Testing Strategy:**
- Tests run with NODE_ENV=test for in-memory database
- Effect programs can be tested in isolation using mock layers
- Layer-based dependency injection for testability

**Data Layer:**
- `packages/core/src/shared/database/schema.ts` - Drizzle ORM schema definitions
- Database uses libSQL with automatic schema initialization
- Test environment uses in-memory database (`:memory:`)

### Multi-Interface Architecture (Web + CLI)

The codebase is designed with a clear separation of concerns to support multiple interfaces (web API and CLI) while sharing core business logic.

**Application Layer** (Framework-agnostic):
- Core application service interface independent of HTTP frameworks
- Composed Effect layers for dependency injection
- Shared business logic between interfaces

**Web Interface**:
- Hono web API routes using the shared application layer
- Web-specific layer composition
- React frontend with TypeScript

**CLI Interface**:
- Command-line interface using Citty framework with the same application services
- CLI output helpers with proper linting compliance

**Shared Core Logic**:
- Core embedding service (domain layer)
- Environment variable helpers
- Console output utilities

**Architecture Benefits**:
- **Reusability**: Core business logic is shared between web and CLI interfaces
- **Testability**: Application services can be tested independently of presentation layer
- **Maintainability**: Clear separation between framework-specific code and business logic
- **Extensibility**: Easy to add new interfaces (e.g., gRPC, GraphQL) using the same core services

### CLI Usage Examples

The CLI interface provides full functionality for embedding operations:

**Create embedding from text:**
```bash
# Direct text input
ees create "doc1" --text "Sample text content"

# From file
ees create "doc2" --file "./sample.txt"

# From stdin (interactive)
ees create "doc3"
# (then type or paste text and press Ctrl+D)
```

**Batch operations:**
```bash
# JSON array format
ees batch ./batch.json

# Newline-delimited JSON format
ees batch ./batch.jsonl
```

**Search operations:**
```bash
# Basic search
ees search "sample text"

# Advanced search with parameters
ees search "sample text" --limit 10 --threshold 0.7 --metric cosine
```

**List and management:**
```bash
# List all embeddings
ees list

# List with filters
ees list --uri "doc*" --model "nomic-embed-text" --limit 20

# Get specific embedding
ees get "doc1" --model-name "nomic-embed-text"

# Delete embedding
ees delete 123

# Upload files
ees upload file1.txt file2.pdf --model "nomic-embed-text"

# Model migration
ees migrate "old-model" "new-model" --dry-run

# Provider management
ees providers list
ees providers current
ees providers models --provider ollama
ees providers ollama-status

# List available models
ees models
```

### API Endpoints

**Embeddings API**:
- `POST /embeddings` - Create embedding from text
- `POST /embeddings/batch` - Create multiple embeddings in a single request
- `POST /embeddings/search` - Search for similar embeddings using various metrics
- `GET /embeddings` - List all embeddings with pagination support
- `GET /embeddings/{uri}` - Get embedding by URI
- `DELETE /embeddings/{id}` - Delete embedding by ID

**File Operations**:
- `POST /upload` - Upload files and create embeddings
- `POST /migrate` - Migrate embeddings between models
- `GET /migrate/compatibility` - Check model compatibility

**Providers & Models**:
- `GET /providers` - List available providers
- `GET /providers/current` - Get current provider
- `GET /providers/models` - List models for provider
- `GET /providers/ollama/status` - Check Ollama service status
- `GET /models` - List all available models

**Request/Response Types**:
- Input validation via Zod schemas
- Type definitions for embedding operations

### Development Environment

**Nix Flakes**:
- Modern, declarative approach for reproducible environments
- Provides isolated development shell with all dependencies
- Automatic Ollama service startup and data directory creation
- Cross-platform support (Linux, macOS)
- Lock file ensures reproducible builds across machines

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