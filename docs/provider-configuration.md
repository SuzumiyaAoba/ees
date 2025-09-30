# Provider Configuration Guide

Complete guide for configuring embedding providers in EES (Embeddings API Service).

## Table of Contents

- [Overview](#overview)
- [Supported Providers](#supported-providers)
- [Provider Setup](#provider-setup)
  - [Ollama (Default)](#ollama-default)
  - [OpenAI](#openai)
  - [Google AI](#google-ai)
  - [Cohere](#cohere)
  - [Mistral AI](#mistral-ai)
  - [Azure OpenAI](#azure-openai)
- [Model Selection](#model-selection)
- [Performance Comparison](#performance-comparison)
- [Cost Considerations](#cost-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

EES supports multiple embedding providers, allowing you to choose based on your requirements for cost, performance, language support, and infrastructure preferences.

### Provider Selection Criteria

| Factor | Best Choice |
|--------|-------------|
| **Self-hosted / Privacy** | Ollama |
| **Best Quality (English)** | OpenAI text-embedding-3-large |
| **Multilingual** | Cohere embed-multilingual-v3.0 |
| **Cost-effective** | Ollama (free) or OpenAI text-embedding-3-small |
| **Fast inference** | Ollama (local) or Cohere |
| **Enterprise Azure** | Azure OpenAI |

## Supported Providers

| Provider | Free Tier | Self-Hosted | API Key Required | Languages |
|----------|-----------|-------------|------------------|-----------|
| **Ollama** | ✅ Yes (Unlimited) | ✅ Yes | ❌ No | Multiple |
| **OpenAI** | ❌ No | ❌ No | ✅ Yes | 100+ |
| **Google AI** | ✅ Limited | ❌ No | ✅ Yes | 100+ |
| **Cohere** | ✅ Limited | ❌ No | ✅ Yes | 100+ |
| **Mistral** | ✅ Limited | ❌ No | ✅ Yes | Multiple |
| **Azure OpenAI** | ❌ No | ☁️ Azure | ✅ Yes | 100+ |

---

## Provider Setup

### Ollama (Default)

**Overview:**
Ollama provides local, self-hosted embedding models with no API costs. It's the default provider for EES.

**Advantages:**
- ✅ Completely free
- ✅ Full data privacy (no data leaves your server)
- ✅ No rate limits
- ✅ Works offline
- ✅ Fast inference on local hardware

**Requirements:**
- Ollama installed and running
- Sufficient RAM (4GB+ recommended)
- GPU optional but recommended for better performance

**Installation:**

**macOS/Linux:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve
```

**Using Nix (Recommended for EES development):**
```bash
# Enter Nix development environment (includes Ollama)
nix develop

# Ollama starts automatically in the Nix shell
```

**Pull Models:**
```bash
# Recommended model (768 dimensions, optimized for retrieval)
ollama pull nomic-embed-text

# Alternative models
ollama pull mxbai-embed-large     # 1024 dimensions, higher quality
ollama pull all-minilm           # 384 dimensions, faster but lower quality
```

**Environment Configuration:**
```bash
# .env
EES_PROVIDER=ollama
EES_OLLAMA_BASE_URL=http://localhost:11434
EES_OLLAMA_DEFAULT_MODEL=nomic-embed-text
```

**Verify Setup:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/version

# Check model is available
curl http://localhost:11434/api/tags

# Test EES connection
curl http://localhost:3000/providers/ollama/status
```

**Recommended Models:**

| Model | Dimensions | Size | Use Case |
|-------|------------|------|----------|
| `nomic-embed-text` | 768 | 274MB | General purpose, best balance |
| `mxbai-embed-large` | 1024 | 670MB | Higher quality, slower |
| `all-minilm` | 384 | 120MB | Fast, low resource |

---

### OpenAI

**Overview:**
OpenAI provides state-of-the-art embedding models with excellent quality and broad language support.

**Advantages:**
- ✅ Excellent embedding quality
- ✅ 100+ languages supported
- ✅ Scalable infrastructure
- ✅ No local infrastructure needed

**Requirements:**
- OpenAI API account
- API key with embeddings access
- Active payment method (pay-as-you-go)

**Setup:**

1. **Get API Key:**
   - Visit https://platform.openai.com/api-keys
   - Create new API key
   - Copy and store securely

2. **Configure EES:**
```bash
# .env
EES_PROVIDER=openai
EES_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
EES_OPENAI_DEFAULT_MODEL=text-embedding-3-small

# Optional: Custom base URL for OpenAI-compatible APIs
# EES_OPENAI_BASE_URL=https://api.openai.com/v1
```

3. **Verify Setup:**
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $EES_OPENAI_API_KEY"

# Test EES connection
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"uri":"test","text":"Hello world","model_name":"text-embedding-3-small"}'
```

**Available Models:**

| Model | Dimensions | Cost (per 1M tokens) | Performance |
|-------|------------|---------------------|-------------|
| `text-embedding-3-small` | 1536 | $0.02 | Good, fast |
| `text-embedding-3-large` | 3072 | $0.13 | Excellent, slower |
| `text-embedding-ada-002` | 1536 | $0.10 | Good (legacy) |

**Cost Example:**
- 1 million tokens ≈ 750,000 words
- Average document (500 words) ≈ 667 tokens
- 1M tokens = ~1,500 documents
- Cost: $0.02 - $0.13 per 1,500 documents

**Best Practices:**
- Use `text-embedding-3-small` for most use cases
- Use `text-embedding-3-large` for highest quality semantic search
- Batch requests when possible to reduce latency
- Monitor usage at https://platform.openai.com/usage

---

### Google AI

**Overview:**
Google AI provides high-quality embeddings through the Gemini API.

**Advantages:**
- ✅ Free tier available (up to 1,500 requests/day)
- ✅ Good quality embeddings
- ✅ Fast inference
- ✅ Integrated with Google Cloud

**Requirements:**
- Google Cloud account (or Google AI Studio account)
- API key

**Setup:**

1. **Get API Key:**
   - Visit https://makersuite.google.com/app/apikey
   - Create new API key
   - Enable the Generative Language API

2. **Configure EES:**
```bash
# .env
EES_PROVIDER=google
EES_GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
EES_GOOGLE_DEFAULT_MODEL=text-embedding-004
```

3. **Verify Setup:**
```bash
# Test API key
curl "https://generativelanguage.googleapis.com/v1/models?key=$EES_GOOGLE_API_KEY"

# Test EES connection
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"uri":"test","text":"Hello world","model_name":"text-embedding-004"}'
```

**Available Models:**

| Model | Dimensions | Rate Limit (Free) | Performance |
|-------|------------|------------------|-------------|
| `text-embedding-004` | 768 | 1,500 requests/day | Excellent |
| `embedding-001` | 768 | 1,500 requests/day | Good (legacy) |

**Free Tier Limits:**
- 1,500 requests per day
- 15 requests per minute
- No credit card required

---

### Cohere

**Overview:**
Cohere specializes in enterprise NLP with excellent multilingual embeddings.

**Advantages:**
- ✅ Excellent multilingual support
- ✅ Fast inference
- ✅ Trial tier available
- ✅ Enterprise-grade reliability

**Requirements:**
- Cohere account
- API key

**Setup:**

1. **Get API Key:**
   - Visit https://dashboard.cohere.ai/api-keys
   - Sign up for free trial
   - Generate API key

2. **Configure EES:**
```bash
# .env
EES_PROVIDER=cohere
EES_COHERE_API_KEY=xxxxxxxxxxxxxxxxxxxx
EES_COHERE_DEFAULT_MODEL=embed-english-v3.0
```

3. **Verify Setup:**
```bash
# Test EES connection
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"uri":"test","text":"Hello world","model_name":"embed-english-v3.0"}'
```

**Available Models:**

| Model | Dimensions | Languages | Best For |
|-------|------------|-----------|----------|
| `embed-english-v3.0` | 1024 | English | English content |
| `embed-multilingual-v3.0` | 1024 | 100+ | Multilingual content |

**Pricing:**
- Trial: 1,000 calls/month free
- Production: Starting at $0.10 per 1,000 searches

---

### Mistral AI

**Overview:**
Mistral AI provides efficient, open-source-based embedding models.

**Advantages:**
- ✅ European-based (GDPR compliant)
- ✅ Good quality
- ✅ Competitive pricing
- ✅ Fast inference

**Requirements:**
- Mistral AI account
- API key

**Setup:**

1. **Get API Key:**
   - Visit https://console.mistral.ai/
   - Create account
   - Generate API key

2. **Configure EES:**
```bash
# .env
EES_PROVIDER=mistral
EES_MISTRAL_API_KEY=xxxxxxxxxxxxxxxx
EES_MISTRAL_DEFAULT_MODEL=mistral-embed
```

3. **Verify Setup:**
```bash
# Test EES connection
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"uri":"test","text":"Hello world","model_name":"mistral-embed"}'
```

**Available Models:**

| Model | Dimensions | Performance |
|-------|------------|-------------|
| `mistral-embed` | 1024 | Excellent |

---

### Azure OpenAI

**Overview:**
Azure OpenAI provides OpenAI models through Microsoft Azure infrastructure.

**Advantages:**
- ✅ Enterprise SLAs
- ✅ Azure ecosystem integration
- ✅ Regional data residency
- ✅ Microsoft support

**Requirements:**
- Azure subscription
- Azure OpenAI resource
- Deployment created

**Setup:**

1. **Create Azure OpenAI Resource:**
   - Visit https://portal.azure.com
   - Create Azure OpenAI resource
   - Deploy embedding model
   - Note: Resource name, deployment name, and API key

2. **Configure EES:**
```bash
# .env
EES_PROVIDER=azure
EES_AZURE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
EES_AZURE_RESOURCE_NAME=your-resource-name
EES_AZURE_DEPLOYMENT=your-deployment-name
EES_AZURE_ENDPOINT=https://your-resource-name.openai.azure.com
EES_AZURE_DEFAULT_MODEL=text-embedding-3-small
```

3. **Verify Setup:**
```bash
# Test Azure OpenAI connection
curl "https://your-resource-name.openai.azure.com/openai/deployments/your-deployment-name/embeddings?api-version=2023-05-15" \
  -H "api-key: $EES_AZURE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":"test"}'
```

**Available Models:**
Same as OpenAI (text-embedding-3-small, text-embedding-3-large, etc.)

**Pricing:**
Similar to OpenAI but billed through Azure

---

## Model Selection

### By Use Case

**Semantic Search:**
- Best: OpenAI text-embedding-3-large
- Good: Cohere embed-english-v3.0, Ollama nomic-embed-text
- Fast: OpenAI text-embedding-3-small

**Multilingual:**
- Best: Cohere embed-multilingual-v3.0
- Good: OpenAI text-embedding-3-small

**Privacy/Self-hosted:**
- Only option: Ollama (any model)

**Cost-sensitive:**
- Free: Ollama (unlimited)
- Paid: OpenAI text-embedding-3-small ($0.02/1M tokens)

### By Language

| Language | Recommended Provider | Model |
|----------|---------------------|-------|
| English only | OpenAI or Ollama | text-embedding-3-small, nomic-embed-text |
| Multilingual | Cohere | embed-multilingual-v3.0 |
| European languages | Mistral | mistral-embed |
| Asian languages | OpenAI or Google | text-embedding-3-small, text-embedding-004 |

---

## Performance Comparison

### Embedding Quality (MTEB Benchmark)

| Provider | Model | Score | Rank |
|----------|-------|-------|------|
| OpenAI | text-embedding-3-large | 64.6 | ⭐⭐⭐⭐⭐ |
| Cohere | embed-english-v3.0 | 64.5 | ⭐⭐⭐⭐⭐ |
| OpenAI | text-embedding-3-small | 62.3 | ⭐⭐⭐⭐ |
| Ollama | nomic-embed-text | 62.4 | ⭐⭐⭐⭐ |
| Mistral | mistral-embed | 61.2 | ⭐⭐⭐⭐ |

### Latency Comparison

| Provider | Avg Latency | Network Dependency |
|----------|-------------|-------------------|
| Ollama (local) | 10-50ms | ❌ No |
| OpenAI | 100-300ms | ✅ Yes |
| Cohere | 80-200ms | ✅ Yes |
| Google AI | 100-250ms | ✅ Yes |
| Mistral | 90-220ms | ✅ Yes |

*Latency includes network roundtrip time for cloud providers*

---

## Cost Considerations

### Monthly Cost Estimates

**Scenario: 10,000 documents/month, avg 500 words each**

| Provider | Cost/Month | Notes |
|----------|------------|-------|
| **Ollama** | $0 | Free, unlimited |
| **Google AI** | $0 | Within free tier (1,500 requests/day) |
| **OpenAI (small)** | ~$0.13 | $0.02 per 1M tokens |
| **OpenAI (large)** | ~$0.87 | $0.13 per 1M tokens |
| **Cohere** | ~$1.00 | After trial |
| **Mistral** | ~$0.50 | Competitive pricing |

**Scenario: 1M documents/month**

| Provider | Cost/Month |
|----------|------------|
| Ollama | $0 |
| OpenAI (small) | ~$13.33 |
| OpenAI (large) | ~$86.67 |
| Cohere | ~$100 |

### Cost Optimization Tips

1. **Use Ollama for development** and switch to cloud for production
2. **Cache embeddings** on your side to avoid re-embedding
3. **Use batch operations** to reduce API overhead
4. **Choose appropriate model** - don't overpay for quality you don't need
5. **Monitor usage** with provider dashboards

---

## Troubleshooting

### Ollama Issues

**Problem:** `Failed to connect to Ollama`
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama if not running
ollama serve

# Check if model is pulled
ollama list

# Pull model if missing
ollama pull nomic-embed-text
```

**Problem:** Slow embedding generation
- Solution: Use GPU acceleration or smaller model
- Check system resources (RAM, CPU usage)

### OpenAI Issues

**Problem:** `Authentication error`
```bash
# Verify API key is valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $EES_OPENAI_API_KEY"

# Check API key in .env file
echo $EES_OPENAI_API_KEY
```

**Problem:** Rate limit exceeded
- Solution: Implement exponential backoff
- Upgrade to higher tier
- Use batch operations

### Google AI Issues

**Problem:** `API key not valid`
- Ensure Generative Language API is enabled
- Check API key restrictions (IP/domain)
- Regenerate API key if needed

### General Provider Issues

**Problem:** Model not found
```bash
# List available models for provider
curl http://localhost:3000/providers/models?provider=ollama

# List all available models
curl http://localhost:3000/models
```

**Problem:** Different results across providers
- Expected: Each provider has different models and algorithms
- Solution: Stick to one provider for consistency
- Use model migration carefully

---

## API Key Security

### Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** (.env file)
3. **Rotate keys regularly** (every 90 days)
4. **Use key restrictions** when available (IP, domain)
5. **Monitor usage** for unauthorized access
6. **Use separate keys** for dev/staging/production

### .gitignore Configuration

Ensure your `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

### Key Rotation

When rotating API keys:
1. Generate new key
2. Update EES configuration
3. Restart EES service
4. Delete old key after verification

---

## Multi-Provider Setup

You can configure multiple providers and switch between them:

```bash
# .env - Configure all providers
EES_PROVIDER=ollama  # Default provider

# Ollama
EES_OLLAMA_BASE_URL=http://localhost:11434
EES_OLLAMA_DEFAULT_MODEL=nomic-embed-text

# OpenAI (backup)
EES_OPENAI_API_KEY=sk-xxxxx
EES_OPENAI_DEFAULT_MODEL=text-embedding-3-small

# Google AI (fallback)
EES_GOOGLE_API_KEY=AIzaSy-xxxxx
EES_GOOGLE_DEFAULT_MODEL=text-embedding-004
```

**Switch providers:**
```bash
# Change default provider
export EES_PROVIDER=openai

# Restart EES
npm restart
```

**Use specific provider per request:**
```bash
# Force specific model (includes provider)
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "test",
    "text": "Hello",
    "model_name": "text-embedding-3-small"
  }'
```

---

## Support

- **Provider Documentation:**
  - Ollama: https://ollama.com/docs
  - OpenAI: https://platform.openai.com/docs
  - Google AI: https://ai.google.dev/docs
  - Cohere: https://docs.cohere.ai
  - Mistral: https://docs.mistral.ai
  - Azure OpenAI: https://learn.microsoft.com/azure/ai-services/openai/

- **EES Documentation:** https://github.com/SuzumiyaAoba/ees
- **Issues:** https://github.com/SuzumiyaAoba/ees/issues
