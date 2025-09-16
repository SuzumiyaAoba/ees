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
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production using Vite
- `npm start` - Run production build
- `npm test` - Run tests with Vitest (watch mode)
- `npm run test:run` - Run tests once

### Code Quality
- `npm run lint` - Check code with Biome linter
- `npm run format` - Format code with Biome
- `npm run type-check` - TypeScript type checking without emitting files

**MANDATORY QUALITY CHECKS**: After any implementation or code change, you MUST run `npm run type-check` and `npm run lint` to ensure no errors exist. If errors occur, fix the problematic parts before proceeding or committing changes. This is a strict requirement for all development work.

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

**When to Add Tests:**
1. **New API endpoints** - Add comprehensive tests covering success cases, error cases, validation, and edge cases
2. **New service methods** - Test all public methods with various inputs and error conditions
3. **New business logic** - Cover all code paths including happy path and error scenarios
4. **Bug fixes** - Add regression tests to prevent the same bug from reoccurring
5. **Feature enhancements** - Update existing tests and add new ones for new functionality

**Test Coverage Requirements:**
- All new public methods must have corresponding unit tests
- Critical business logic must achieve >90% test coverage
- Error handling and edge cases must be explicitly tested
- Integration tests should be added for complex workflows

**Test Structure:**
- Tests are located in `src/__tests__/` directory
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