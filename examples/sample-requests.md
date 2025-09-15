# EES API Sample Requests

## Prerequisites

The EES API server must be running:

```bash
# Using Nix flakes
nix run

# Or in development environment
nix develop
npm run dev
```

## Basic API Request Examples

### 1. Server Connection Check

```bash
curl http://localhost:3001/
```

**Expected Response:**
```
EES - Embeddings API Service
```

### 2. Embedding Creation

#### Basic Embedding Creation

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is a sample text for embedding generation."
  }'
```

#### Custom Model Specification

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://custom-example.txt",
    "text": "Advanced text processing example.",
    "model_name": "embeddinggemma:300m"
  }'
```

#### Japanese Text Embedding

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://japanese-text.txt",
    "text": "これは日本語のテキストです。自然言語処理の技術を使用してベクトル化されます。"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "model_name": "embeddinggemma:300m",
  "message": "Embedding created successfully"
}
```

### 3. Embedding Retrieval

#### Get All Embeddings

```bash
curl http://localhost:3001/embeddings
```

**Expected Response:**
```json
{
  "embeddings": [
    {
      "id": 1,
      "uri": "file://example.txt",
      "model_name": "embeddinggemma:300m",
      "embedding": [0.1, 0.2, 0.3, ...],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get by Specific URI

```bash
curl http://localhost:3001/embeddings/file%3A%2F%2Fexample.txt
```

**Expected Response:**
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "model_name": "embeddinggemma:300m",
  "embedding": [0.1, 0.2, 0.3, ...],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Embedding Deletion

```bash
curl -X DELETE http://localhost:3001/embeddings/1
```

**Expected Response:**
```json
{
  "message": "Embedding deleted successfully"
}
```

## Advanced Usage Examples

### 1. Embedding Updates

Sending new text with the same `uri` updates the existing embedding:

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is an updated version of the text with new content."
  }'
```

### 2. Bulk Creation of Multiple Texts

```bash
# Document 1
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://document1.txt",
    "text": "First document content for vector search."
  }'

# Document 2
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://document2.txt",
    "text": "Second document with different content for comparison."
  }'

# Web page
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "https://example.com/page1",
    "text": "Third document containing technical information about machine learning."
  }'
```

### 3. Long Text Processing

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://long-document.txt",
    "text": "This is a longer document that contains multiple sentences and paragraphs. It demonstrates how the embedding API handles larger texts and generates comprehensive vector representations. The system uses advanced natural language processing techniques to understand the semantic meaning of the content and create high-quality embeddings suitable for various AI applications including semantic search, content recommendation, and text classification tasks."
  }'
```

## Error Handling Examples

### 1. Invalid Request Format

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "invalid_field": "This will cause an error"
  }'
```

**Expected Response:**
```json
{
  "error": "Failed to create embedding"
}
```

### 2. Non-existent URI Retrieval

```bash
curl http://localhost:3001/embeddings/file%3A%2F%2Fnonexistent.txt
```

**Expected Response:**
```json
{
  "error": "Embedding not found"
}
```

### 3. Invalid ID Deletion

```bash
curl -X DELETE http://localhost:3001/embeddings/999
```

**Expected Response:**
```json
{
  "error": "Embedding not found"
}
```

## Automated Test Script

To run the complete test suite:

```bash
./examples/api-test.sh
```

This script executes the following:
- Server connection check
- Basic embedding creation
- Custom model creation
- Japanese text processing
- Embedding retrieval (all/individual)
- Embedding updates
- Error case verification

## Notes

1. **First Execution**: Ollama model (embeddinggemma:300m) download occurs, which may take time
2. **Port Configuration**: Default is port 3001. Changeable via `PORT` environment variable
3. **Model Specification**: If `model_name` is omitted, `embeddinggemma:300m` is used by default
4. **URI**: `uri` must be unique. Resending with the same URI updates existing data. File paths, URLs, arbitrary identifiers - any data location identifier string can be specified