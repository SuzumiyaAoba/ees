# EES - Embeddings API Service

A modern TypeScript API service for generating and managing text embeddings using Ollama and libSQL, built with functional programming principles using Effect.

## Features

- 🤖 **AI Integration**: Local embedding generation with Ollama
- 🗄️ **Vector Storage**: Efficient storage and retrieval with libSQL
- 🔧 **Type Safety**: Built with Effect for composable, type-safe operations
- ⚡ **Modern Stack**: Hono, TypeScript, Vitest, Biome
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

- `POST /embeddings` - Create embedding from text
- `GET /embeddings` - List all embeddings
- `GET /embeddings/:filePath` - Get embedding by file path
- `DELETE /embeddings/:id` - Delete embedding by ID

### Example Usage

```bash
# Create an embedding
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "example.txt",
    "text": "Hello, world!",
    "model_name": "embeddinggemma:300m"
  }'

# List embeddings
curl http://localhost:3000/embeddings

# Get specific embedding
curl http://localhost:3000/embeddings/example.txt
```

## Development

### Nix Flakes Commands

- `nix develop` - Enter development environment
- `nix run` - Run the API server
- `nix run .#dev` - Start development server
- `nix build` - Build the application

### Traditional Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Check code quality
- `npm run format` - Format code

## Architecture

Built with Effect functional programming library providing:

- **Type-safe error handling** with tagged error types
- **Dependency injection** via Effect Context system
- **Composable operations** through Effect.gen generators
- **Testable design** with mock layer support

### Key Technologies

- **Effect**: Functional programming and type-safe error handling
- **Hono**: Lightweight web framework
- **Drizzle ORM**: Type-safe database operations
- **Ollama**: Local AI model inference
- **libSQL**: SQLite-compatible database
- **Zod**: Runtime type validation
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

Default model: `embeddinggemma:300m`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the Effect patterns
4. Run tests and type check
5. Submit a pull request

## License

MIT License - see LICENSE file for details.