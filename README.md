# EES - Embeddings API Service

A modern TypeScript monorepo service for generating and managing text embeddings with multi-provider AI support (Ollama, OpenAI, Google AI, Cohere, Mistral, Azure OpenAI) and libSQL storage, built with functional programming principles using Effect.

## Features

- 🤖 **Multi-Provider AI**: Support for Ollama, OpenAI, Google AI, Cohere, Mistral, and Azure OpenAI
- 🗄️ **Vector Storage**: Efficient storage and retrieval with libSQL
- 🔧 **Type Safety**: Built with Effect for composable, type-safe operations
- ⚡ **Modern Stack**: Hono, TypeScript, Vitest, Biome
- 📦 **Monorepo Architecture**: CLI, API, Web, and Core packages
- 🌐 **Multi-Interface**: Web API, CLI, and React frontend
- 📝 **OpenAPI Documentation**: Auto-generated API docs with Swagger UI
- 📦 **Reproducible**: Nix flakes for zero-config development environment

## Quick Start

### With Nix Flakes (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd ees

# Run the API server directly
nix run

# Or start development environment
nix develop
npm run dev
```

### Manual Setup

```bash
# Prerequisites: Node.js 20+, Ollama
npm install
npm run dev
```

## API Endpoints

### Embeddings
- `POST /embeddings` - Create embedding from text
- `POST /embeddings/batch` - Create multiple embeddings in batch
- `POST /embeddings/search` - Search for similar embeddings
- `GET /embeddings` - List all embeddings with pagination
- `GET /embeddings/{uri}` - Get embedding by URI
- `DELETE /embeddings/{id}` - Delete embedding by ID

### File Operations
- `POST /upload` - Upload files and create embeddings
- `POST /migrate` - Migrate embeddings between models
- `GET /migrate/compatibility` - Check model compatibility

### Providers & Models
- `GET /providers` - List available providers
- `GET /providers/current` - Get current provider
- `GET /providers/models` - List models for provider
- `GET /providers/ollama/status` - Check Ollama service status
- `GET /models` - List all available models

### Example Usage

```bash
# Create an embedding
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "example.txt",
    "text": "Hello, world!",
    "model_name": "nomic-embed-text"
  }'

# Batch create embeddings
curl -X POST http://localhost:3000/embeddings/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      {"uri": "doc1", "text": "First document"},
      {"uri": "doc2", "text": "Second document"}
    ],
    "model_name": "nomic-embed-text"
  }'

# Search similar embeddings
curl -X POST http://localhost:3000/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Hello world",
    "model_name": "nomic-embed-text",
    "limit": 5,
    "threshold": 0.7,
    "metric": "cosine"
  }'

# List embeddings with pagination
curl "http://localhost:3000/embeddings?page=1&limit=10&uri_filter=example*"

# Get specific embedding
curl http://localhost:3000/embeddings/example.txt
```

## Development

### Nix Flakes Commands

- `nix develop` - Enter development environment
- `nix run` - Run the API server
- `nix run .#dev` - Start development server
- `nix build` - Build the application

### npm Workspace Commands

- `npm run dev` - Start API development server
- `npm run dev:web` - Start web frontend development server
- `npm run build` - Build all packages (core, cli, api, web)
- `npm start` - Run production API server
- `npm test` - Run tests across all workspaces (watch mode)
- `npm run test:run` - Run tests once across all workspaces
- `npm run lint` - Check code quality with Biome
- `npm run format` - Format code with Biome
- `npm run type-check` - TypeScript type checking

## Architecture

### Monorepo Structure

- **`packages/core`** - Shared business logic, types, database layer, and providers
- **`packages/api`** - REST API server using Hono framework
- **`packages/cli`** - Command-line interface using Citty
- **`packages/web`** - React web frontend with Vite

### Multi-Provider AI Support

**Supported Providers:**
- **Ollama** (default) - Local embeddings with `nomic-embed-text`
- **OpenAI** - `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
- **Google AI** - `embedding-001`, `text-embedding-004`
- **Cohere** - `embed-english-v3.0`, `embed-multilingual-v3.0`
- **Mistral** - `mistral-embed`
- **Azure OpenAI** - Compatible with OpenAI models

### Effect-based Architecture

Built with Effect functional programming library providing:

- **Type-safe error handling** with tagged error types
- **Dependency injection** via Effect Context system
- **Composable operations** through Effect.gen generators
- **Testable design** with mock layer support

### Key Technologies

- **Effect**: Functional programming and type-safe error handling
- **Hono**: Lightweight web framework with OpenAPI support
- **Drizzle ORM**: Type-safe database operations
- **Vercel AI SDK**: Multi-provider AI integration
- **libSQL**: SQLite-compatible database
- **Citty**: Modern CLI framework
- **Zod**: Runtime type validation and OpenAPI schemas
- **Vitest**: Testing framework
- **Biome**: Code formatting and linting

## Deployment

### With Nix

```bash
# Build the package
nix build

# Run the built package
./result/bin/ees
```

### Traditional

```bash
npm run build
npm start
```

## Configuration

Environment variables:

- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3000)

Default model: `nomic-embed-text` (Ollama)

### Provider Configuration

Environment variables for different providers:

**Ollama (Default):**
- `EES_OLLAMA_BASE_URL` - Ollama service URL (default: http://localhost:11434)
- `EES_OLLAMA_DEFAULT_MODEL` - Default model (default: nomic-embed-text)

**OpenAI:**
- `EES_OPENAI_API_KEY` - OpenAI API key
- `EES_OPENAI_BASE_URL` - Optional custom base URL

**Google AI:**
- `EES_GOOGLE_API_KEY` - Google AI API key

**Cohere:**
- `EES_COHERE_API_KEY` - Cohere API key

**Mistral:**
- `EES_MISTRAL_API_KEY` - Mistral API key

**Azure OpenAI:**
- `EES_AZURE_API_KEY` - Azure OpenAI API key
- `EES_AZURE_BASE_URL` - Azure OpenAI endpoint
- `EES_AZURE_API_VERSION` - API version

## CLI Usage

The CLI provides full functionality for embedding operations:

```bash
# Install globally or use npx
npm install -g @ees/cli

# Create embedding from text
ees create "doc1" --text "Sample text content"
ees create "doc2" --file "./sample.txt"
ees create "doc3"  # Interactive mode (type text and press Ctrl+D)

# Batch operations
ees batch ./batch.json
ees batch ./batch.jsonl

# Search operations
ees search "sample text" --limit 10 --threshold 0.7 --metric cosine

# List and management
ees list
ees list --uri "doc*" --model "nomic-embed-text" --limit 20
ees get "doc1" --model-name "nomic-embed-text"
ees delete 123

# File upload
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

## Web Interface

Start the web frontend for a graphical interface:

```bash
npm run dev:web
# Visit http://localhost:5173
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the Effect patterns and code quality standards
4. **MANDATORY**: Run `npm run type-check` and `npm run lint` to ensure no errors
5. Add unit tests for new features (TDD for bug fixes)
6. Run tests with `npm run test:run`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.