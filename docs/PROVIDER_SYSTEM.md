# Multi-Provider Embedding System

## Overview

The EES application now supports multiple embedding providers through a unified abstraction layer. This allows you to use OpenAI, Google AI, or Ollama for generating embeddings while maintaining a consistent API.

## Supported Providers

### 1. Ollama (Default)
- **Type**: `ollama`
- **Cost**: Free (local)
- **Setup**: Requires local Ollama installation
- **Default Model**: `nomic-embed-text`
- **Implementation**: Uses Vercel AI SDK with `ollama-ai-provider-v2`

### 2. OpenAI
- **Type**: `openai`
- **Cost**: Pay-per-use
- **Setup**: Requires API key
- **Default Model**: `text-embedding-3-small`
- **Supported Models**: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`

### 3. Google AI
- **Type**: `google`
- **Cost**: Pay-per-use
- **Setup**: Requires API key
- **Default Model**: `text-embedding-004`
- **Supported Models**: `text-embedding-004`, `embedding-001`

## Configuration

### Environment Variables

Configure providers using environment variables:

```bash
# Default provider selection
EES_DEFAULT_PROVIDER=ollama  # ollama | openai | google

# Ollama configuration
EES_OLLAMA_BASE_URL=http://localhost:11434
EES_OLLAMA_DEFAULT_MODEL=nomic-embed-text

# OpenAI configuration
EES_OPENAI_API_KEY=sk-your-openai-key
EES_OPENAI_BASE_URL=https://api.openai.com/v1  # optional
EES_OPENAI_DEFAULT_MODEL=text-embedding-3-small  # optional
EES_OPENAI_ORGANIZATION=your-org-id  # optional

# Google AI configuration
EES_GOOGLE_API_KEY=your-google-api-key
EES_GOOGLE_BASE_URL=  # optional, uses default Google AI endpoint
EES_GOOGLE_DEFAULT_MODEL=text-embedding-004  # optional
```

### Programmatic Configuration

```typescript
import {
  createOllamaConfig,
  createOpenAIConfig,
  createGoogleConfig,
  createMultiProviderConfig,
  createEmbeddingProviderService,
} from "./src/shared/providers"

// Create individual provider configs
const ollamaConfig = createOllamaConfig({
  baseUrl: "http://localhost:11434",
  defaultModel: "nomic-embed-text",
})

const openaiConfig = createOpenAIConfig("sk-your-api-key", {
  defaultModel: "text-embedding-3-small",
  organization: "your-org-id",
})

const googleConfig = createGoogleConfig("your-google-api-key", {
  defaultModel: "text-embedding-004",
})

// Create multi-provider configuration
const factoryConfig = createMultiProviderConfig(
  ollamaConfig,  // default provider
  [openaiConfig, googleConfig]  // additional available providers
)

// Create the service layer
const serviceLayer = createEmbeddingProviderService(factoryConfig)
```

## Usage Examples

### Basic Embedding Generation

```typescript
import { Effect } from "effect"
import { EmbeddingProviderService } from "./src/shared/providers"

const generateEmbedding = Effect.gen(function* () {
  const provider = yield* EmbeddingProviderService

  const result = yield* provider.generateEmbedding({
    text: "Hello, world!",
    modelName: "text-embedding-3-small", // optional
  })

  console.log("Embedding:", result.embedding)
  console.log("Model:", result.model)
  console.log("Provider:", result.provider)
  console.log("Dimensions:", result.dimensions)
})

// Run with your configured service layer
Effect.runPromise(generateEmbedding.pipe(Effect.provide(serviceLayer)))
```

### Provider Management

```typescript
const providerManagement = Effect.gen(function* () {
  const provider = yield* EmbeddingProviderService

  // List available providers
  const providers = yield* provider.listAllProviders()
  console.log("Available providers:", providers)

  // Get current provider
  const current = yield* provider.getCurrentProvider()
  console.log("Current provider:", current)

  // List models for current provider
  const models = yield* provider.listModels()
  console.log("Available models:", models.map(m => m.name))
})
```

### Error Handling

The provider system includes comprehensive error handling:

```typescript
import {
  ProviderAuthenticationError,
  ProviderConnectionError,
  ProviderModelError,
  ProviderRateLimitError,
} from "./src/shared/providers"

const handleEmbeddingWithErrors = Effect.gen(function* () {
  const provider = yield* EmbeddingProviderService

  const result = yield* provider.generateEmbedding({
    text: "Test text",
  }).pipe(
    Effect.catchTag("ProviderAuthenticationError", (error) =>
      Effect.fail(`Auth failed for ${error.provider}: ${error.message}`)
    ),
    Effect.catchTag("ProviderRateLimitError", (error) =>
      Effect.fail(`Rate limited for ${error.provider}, retry after ${error.retryAfter}s`)
    ),
    Effect.catchTag("ProviderModelError", (error) =>
      Effect.fail(`Model ${error.modelName} error: ${error.message}`)
    ),
    Effect.catchAll((error) =>
      Effect.fail(`Unknown error: ${error}`)
    )
  )

  return result
})
```

## Migration from Original Implementation

The new provider system is designed to be backward compatible. The original `EmbeddingService` continues to work with Ollama, while the new `EmbeddingServiceV2` supports multiple providers.

### Key Differences

| Feature | Original | New Provider System |
|---------|----------|-------------------|
| Providers | Ollama only | Ollama, OpenAI, Google AI |
| Configuration | Hard-coded | Environment variables + programmatic |
| Error Types | Ollama-specific | Provider-agnostic with specific subtypes |
| Model Management | Basic | Full model listing and info |
| Provider Switching | Not supported | Runtime switching (planned) |

### Upgrading

1. **Install Dependencies**:
   ```bash
   npm install ai @ai-sdk/openai @ai-sdk/google ollama-ai-provider-v2
   ```

2. **Update Service Layer**:
   ```typescript
   // Old
   import { EmbeddingServiceLive } from "./entities/embedding/api/embedding"

   // New
   import { createEmbeddingProviderService, getDefaultProvider } from "./shared/providers"

   const providerConfig = getDefaultProvider()
   const serviceLayer = createEmbeddingProviderService({ defaultProvider: providerConfig })
   ```

3. **Set Environment Variables** (if using non-Ollama providers):
   ```bash
   export EES_OPENAI_API_KEY=sk-your-key
   export EES_DEFAULT_PROVIDER=openai
   ```

## Architecture

The provider system follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Application Layer          │
│         (EmbeddingServiceV2)        │
├─────────────────────────────────────┤
│         Provider Factory            │
│    (EmbeddingProviderService)       │
├─────────────────────────────────────┤
│    Individual Provider Services     │
│  ┌─────────┬─────────┬─────────┐   │
│  │ Ollama  │ OpenAI  │ Google  │   │
│  └─────────┴─────────┴─────────┘   │
├─────────────────────────────────────┤
│         External APIs               │
│  ┌─────────┬─────────┬─────────┐   │
│  │ Ollama  │ OpenAI  │ Google  │   │
│  │   SDK   │   SDK   │   SDK   │   │
│  └─────────┴─────────┴─────────┘   │
└─────────────────────────────────────┘
```

## Testing

The provider system includes comprehensive tests:

- **Unit Tests**: Individual provider implementations
- **Integration Tests**: Provider factory and multi-provider scenarios
- **Configuration Tests**: Environment variable handling
- **Error Handling Tests**: Various error scenarios

Run provider tests:
```bash
npm test -- --run src/shared/providers src/shared/config
```

## Performance Considerations

- **Ollama**: Local processing, no network latency, free
- **OpenAI**: Fast API, pay-per-token, various model sizes
- **Google AI**: Competitive pricing, good performance

### Model Comparison

| Provider | Model | Dimensions | Max Tokens | Price/1M tokens |
|----------|-------|------------|------------|-----------------|
| Ollama | nomic-embed-text | 768 | 8192 | Free |
| OpenAI | text-embedding-3-small | 1536 | 8191 | $0.02 |
| OpenAI | text-embedding-3-large | 3072 | 8191 | $0.13 |
| Google | embedding-001 | 768 | 2048 | ~$0.01 |

## Future Enhancements

- **Runtime Provider Switching**: Switch providers without restart
- **Load Balancing**: Distribute requests across multiple providers
- **Caching**: Cache embeddings across providers
- **Fallback Chains**: Automatic fallback to backup providers
- **Cost Monitoring**: Track usage and costs per provider