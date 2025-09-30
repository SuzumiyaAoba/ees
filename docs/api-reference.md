# API Reference

Complete reference documentation for the EES (Embeddings API Service) REST API.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Create Embedding](#create-embedding)
  - [Batch Create Embeddings](#batch-create-embeddings)
  - [Search Embeddings](#search-embeddings)
  - [Get Embedding](#get-embedding)
  - [List Embeddings](#list-embeddings)
  - [Delete Embedding](#delete-embedding)
  - [Upload Files](#upload-files)
  - [Migrate Embeddings](#migrate-embeddings)
  - [List Models](#list-models)
  - [Provider Management](#provider-management)

## Overview

The EES API provides a RESTful interface for managing text embeddings. It supports multiple embedding providers (Ollama, OpenAI, Google AI, Cohere, Mistral, Azure OpenAI) and offers vector similarity search capabilities.

**API Version:** 1.0.0
**OpenAPI Specification:** Available at `/openapi.json`
**Interactive Documentation:** Available at `/docs` (Swagger UI)

## Base URL

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-domain.com
```

## Authentication

Currently, the API does not require authentication by default. To enable authentication:

1. Set `API_KEY` in your environment variables
2. Include the API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/embeddings
```

## Request Format

All requests must use `Content-Type: application/json` for POST/PUT requests.

**Headers:**
- `Content-Type: application/json` (required for POST/PUT)
- `X-API-Key: <key>` (optional, if authentication is enabled)

**Body:** JSON formatted request payload

## Response Format

All responses are JSON formatted with the following structure:

**Success Response (2xx):**
```json
{
  "data": { ... },
  "metadata": { ... }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "Error message",
  "details": "Detailed error description",
  "code": "ERROR_CODE"
}
```

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters or malformed JSON |
| 404 | NOT_FOUND | Requested resource not found |
| 413 | PAYLOAD_TOO_LARGE | Request body exceeds size limit |
| 422 | VALIDATION_ERROR | Request validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server-side error |
| 503 | SERVICE_UNAVAILABLE | Embedding provider unavailable |

**Common Error Scenarios:**

- **URI too long:** Max 2048 characters
- **Text too long:** Max 100,000 characters
- **Empty text:** Text cannot be empty
- **Invalid model:** Model not available
- **Provider unavailable:** Check provider connectivity

## Rate Limiting

Rate limits vary by endpoint type:

| Endpoint Type | Rate Limit |
|---------------|------------|
| Embedding Creation | 100 requests/minute |
| Search | 200 requests/minute |
| Read Operations | 500 requests/minute |
| General | 300 requests/minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Endpoints

### Health Check

Check if the API service is running.

**Endpoint:** `GET /`

**Response:**
```
EES - Embeddings API Service
```

**Example:**
```bash
curl http://localhost:3000/
```

---

### Create Embedding

Create a new embedding from text content.

**Endpoint:** `POST /embeddings`

**Request Body:**
```json
{
  "uri": "document-1",
  "text": "This is the text content to embed",
  "model_name": "nomic-embed-text"
}
```

**Parameters:**
- `uri` (string, required): Unique identifier for the embedding (max 2048 chars)
- `text` (string, required): Text content to embed (1-100000 chars)
- `model_name` (string, optional): Model to use (defaults to configured default)

**Response (200 OK):**
```json
{
  "id": 1,
  "uri": "document-1",
  "model_name": "nomic-embed-text",
  "message": "Embedding created successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "document-1",
    "text": "This is the text content to embed",
    "model_name": "nomic-embed-text"
  }'
```

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:3000/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uri: 'document-1',
    text: 'This is the text content to embed',
    model_name: 'nomic-embed-text',
  }),
});

const data = await response.json();
console.log(data);
```

**Python Example:**
```python
import requests

response = requests.post(
    'http://localhost:3000/embeddings',
    json={
        'uri': 'document-1',
        'text': 'This is the text content to embed',
        'model_name': 'nomic-embed-text',
    }
)

data = response.json()
print(data)
```

**Error Responses:**
- `400`: Invalid request (URI too long, text empty, etc.)
- `503`: Provider unavailable

---

### Batch Create Embeddings

Create multiple embeddings in a single request.

**Endpoint:** `POST /embeddings/batch`

**Request Body:**
```json
{
  "items": [
    {
      "uri": "doc1",
      "text": "First document text"
    },
    {
      "uri": "doc2",
      "text": "Second document text"
    }
  ],
  "model_name": "nomic-embed-text"
}
```

**Parameters:**
- `items` (array, required): Array of items to embed (max 100 items)
  - `uri` (string, required): Unique identifier
  - `text` (string, required): Text content
- `model_name` (string, optional): Model to use for all embeddings

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": 1,
      "uri": "doc1",
      "success": true
    },
    {
      "id": 2,
      "uri": "doc2",
      "success": true
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/embeddings/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"uri": "doc1", "text": "First document"},
      {"uri": "doc2", "text": "Second document"}
    ],
    "model_name": "nomic-embed-text"
  }'
```

**Best Practices:**
- Process up to 100 items per batch for optimal performance
- Use batch operations for bulk imports
- Handle partial failures gracefully

---

### Search Embeddings

Find similar embeddings using vector similarity search.

**Endpoint:** `POST /embeddings/search`

**Request Body:**
```json
{
  "query": "search query text",
  "limit": 10,
  "threshold": 0.7,
  "metric": "cosine",
  "model_name": "nomic-embed-text"
}
```

**Parameters:**
- `query` (string, required): Text to search for similar embeddings
- `limit` (number, optional): Maximum results to return (default: 10, max: 100)
- `threshold` (number, optional): Similarity threshold 0-1 (default: 0.0)
- `metric` (string, optional): Distance metric - `cosine`, `euclidean`, `dot` (default: cosine)
- `model_name` (string, optional): Model name to search within

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": 1,
      "uri": "document-1",
      "text": "Matching document text",
      "similarity": 0.95,
      "model_name": "nomic-embed-text"
    }
  ],
  "count": 1,
  "query_text": "search query text",
  "metric": "cosine"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "limit": 5,
    "threshold": 0.7,
    "metric": "cosine"
  }'
```

**Similarity Metrics:**

- **Cosine Similarity** (recommended): Measures angle between vectors (0-1, higher is more similar)
- **Euclidean Distance**: L2 distance between vectors (lower is more similar)
- **Dot Product**: Inner product of vectors (higher is more similar)

**Use Cases:**
- Semantic search
- Document similarity
- Recommendation systems
- Duplicate detection

---

### Get Embedding

Retrieve a specific embedding by URI and model name.

**Endpoint:** `GET /embeddings/:uri/:model_name`

**Parameters:**
- `uri` (path): URI-encoded embedding identifier
- `model_name` (path): URI-encoded model name

**Response (200 OK):**
```json
{
  "id": 1,
  "uri": "document-1",
  "text": "Original text content",
  "embedding": [0.1, 0.2, ...],
  "model_name": "nomic-embed-text",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/embeddings/document-1/nomic-embed-text
```

**JavaScript Example:**
```javascript
const uri = encodeURIComponent('document-1');
const modelName = encodeURIComponent('nomic-embed-text');
const response = await fetch(
  `http://localhost:3000/embeddings/${uri}/${modelName}`
);
const data = await response.json();
```

**Error Responses:**
- `404`: Embedding not found

---

### List Embeddings

Get a paginated list of embeddings with optional filtering.

**Endpoint:** `GET /embeddings`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `uri` (string, optional): Filter by URI pattern
- `model_name` (string, optional): Filter by model name

**Response (200 OK):**
```json
{
  "embeddings": [
    {
      "id": 1,
      "uri": "document-1",
      "model_name": "nomic-embed-text",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

**cURL Examples:**
```bash
# List all embeddings (first page)
curl http://localhost:3000/embeddings

# Get page 2 with 20 items per page
curl "http://localhost:3000/embeddings?page=2&limit=20"

# Filter by URI pattern
curl "http://localhost:3000/embeddings?uri=document-*"

# Filter by model name
curl "http://localhost:3000/embeddings?model_name=nomic-embed-text"
```

---

### Delete Embedding

Delete an embedding by its numeric ID.

**Endpoint:** `DELETE /embeddings/:id`

**Parameters:**
- `id` (path): Numeric embedding ID

**Response (200 OK):**
```json
{
  "message": "Embedding deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/embeddings/123
```

**Error Responses:**
- `404`: Embedding not found
- `400`: Invalid ID format

---

### Upload Files

Upload files and create embeddings from their content.

**Endpoint:** `POST /upload`

**Request:** Multipart form data

**Form Fields:**
- `files` (file, required): One or more files to upload
- `model_name` (string, optional): Model to use for embeddings

**Supported File Types:**
- Text files (`.txt`)
- Markdown (`.md`)
- PDF (`.pdf`)
- JSON (`.json`)

**Response (200 OK):**
```json
{
  "results": [
    {
      "filename": "document.txt",
      "uri": "document.txt",
      "id": 1,
      "success": true
    }
  ],
  "total": 1,
  "successful": 1,
  "failed": 0
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/upload \
  -F "files=@document1.txt" \
  -F "files=@document2.pdf" \
  -F "model_name=nomic-embed-text"
```

**File Size Limits:**
- Maximum file size: 10MB per file
- Maximum files per request: 50 files

---

### Migrate Embeddings

Migrate embeddings from one model to another.

**Endpoint:** `POST /migrate`

**Request Body:**
```json
{
  "from_model": "old-model-name",
  "to_model": "new-model-name",
  "dry_run": false
}
```

**Parameters:**
- `from_model` (string, required): Source model name
- `to_model` (string, required): Target model name
- `dry_run` (boolean, optional): Preview changes without applying (default: false)

**Response (200 OK):**
```json
{
  "migrated": 150,
  "failed": 0,
  "total": 150,
  "from_model": "old-model-name",
  "to_model": "new-model-name"
}
```

**Check Compatibility:**

**Endpoint:** `GET /migrate/compatibility?from_model=X&to_model=Y`

**Response:**
```json
{
  "compatible": true,
  "from_model": {
    "name": "old-model",
    "dimensions": 768
  },
  "to_model": {
    "name": "new-model",
    "dimensions": 768
  },
  "recommendations": []
}
```

---

### List Models

Get all available embedding models from configured providers.

**Endpoint:** `GET /models`

**Response (200 OK):**
```json
{
  "models": [
    {
      "name": "nomic-embed-text",
      "provider": "ollama",
      "dimensions": 768,
      "available": true
    },
    {
      "name": "text-embedding-3-small",
      "provider": "openai",
      "dimensions": 1536,
      "available": true
    }
  ],
  "count": 2,
  "providers": ["ollama", "openai"]
}
```

**cURL Example:**
```bash
curl http://localhost:3000/models
```

**Model Information:**
- `name`: Model identifier
- `provider`: Provider name (ollama, openai, google, etc.)
- `dimensions`: Embedding vector dimensions
- `available`: Whether model is currently accessible

---

### Provider Management

#### List Providers

Get all configured embedding providers.

**Endpoint:** `GET /providers`

**Response (200 OK):**
```json
{
  "providers": [
    {
      "name": "ollama",
      "configured": true,
      "active": true,
      "default": true
    },
    {
      "name": "openai",
      "configured": true,
      "active": false,
      "default": false
    }
  ],
  "default": "ollama"
}
```

#### Get Current Provider

**Endpoint:** `GET /providers/current`

**Response (200 OK):**
```json
{
  "provider": "ollama",
  "models": ["nomic-embed-text", "mxbai-embed-large"]
}
```

#### List Provider Models

**Endpoint:** `GET /providers/models?provider=ollama`

**Response (200 OK):**
```json
{
  "provider": "ollama",
  "models": [
    {
      "name": "nomic-embed-text",
      "dimensions": 768
    }
  ]
}
```

#### Ollama Status

Check Ollama service health and connectivity.

**Endpoint:** `GET /providers/ollama/status`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "base_url": "http://localhost:11434",
  "version": "0.1.0",
  "models_available": 2
}
```

---

## Observability Endpoints

### Health Check

**Endpoint:** `GET /health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "ollama": {
      "status": "healthy",
      "responseTime": 50
    }
  }
}
```

### Metrics

**Endpoint:** `GET /metrics`

Returns Prometheus-formatted metrics.

---

## Best Practices

1. **Use Batch Operations**: For bulk imports, use `/embeddings/batch` instead of individual requests
2. **Cache Results**: Cache embedding vectors on your side to reduce API calls
3. **Handle Errors Gracefully**: Implement retry logic for transient failures
4. **Use Appropriate Models**: Choose models based on your language and use case
5. **Monitor Rate Limits**: Track rate limit headers to avoid throttling
6. **URI Naming**: Use consistent, descriptive URIs for embeddings
7. **Search Optimization**: Adjust threshold and metric based on your similarity requirements
8. **Model Migration**: Use dry-run mode before migrating embeddings

## Troubleshooting

### Provider Unavailable (503)

**Problem:** Cannot connect to embedding provider
**Solution:**
- Check provider service is running (e.g., `ollama serve` for Ollama)
- Verify `EES_OLLAMA_BASE_URL` or provider configuration
- Check network connectivity
- Review API logs for detailed error messages

### Text Too Long (400)

**Problem:** Text exceeds maximum length
**Solution:**
- Split text into smaller chunks
- Maximum text length is 100,000 characters
- Consider summarizing content before embedding

### Model Not Found (400)

**Problem:** Specified model not available
**Solution:**
- Use `GET /models` to list available models
- Pull model in Ollama: `ollama pull nomic-embed-text`
- Check provider configuration

### Rate Limit Exceeded (429)

**Problem:** Too many requests
**Solution:**
- Implement exponential backoff
- Use batch operations to reduce request count
- Monitor `X-RateLimit-*` headers

## Support

- **Documentation:** https://github.com/SuzumiyaAoba/ees/tree/main/docs
- **Issues:** https://github.com/SuzumiyaAoba/ees/issues
- **Interactive API Docs:** http://localhost:3000/docs
