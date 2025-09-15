# EES API Sample Tests and Examples

This directory contains sample requests and client examples for testing EES (Embeddings API Service).

## 📋 File List

### 🔧 Test Scripts

- **`api-test.sh`** - Comprehensive API test script (Bash)
- **`sample-requests.md`** - cURL command examples collection

## 🚀 Usage

### Prerequisites

The EES API server must be running:

```bash
# Using Nix flakes (recommended)
nix run

# Or in development environment
nix develop
npm run dev
```

### 1. Comprehensive Testing with Bash Script

```bash
# Grant execute permission (first time only)
chmod +x examples/api-test.sh

# Run tests
./examples/api-test.sh
```

**Script features:**
- ✅ Server connection check
- 📝 Basic embedding creation
- 🔧 Custom model specification
- 🌏 Japanese text processing
- 📖 Embedding retrieval (all/individual)
- 🔄 Embedding updates
- ❌ Error case verification

### 2. Manual Testing (cURL)

See `sample-requests.md` for detailed cURL command examples.

```bash
# Basic example
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://test.txt",
    "text": "Sample text for embedding"
  }'
```

## 📊 Test Coverage

Each test script covers the following functionality:

### ✅ Normal Cases
- Embedding creation (basic)
- Embedding creation (custom model)
- Japanese text processing
- All embeddings retrieval
- URI-specific retrieval
- Embedding updates (overwrite)
- Embedding deletion

### ❌ Error Cases
- Invalid request format
- Non-existent URI retrieval
- Invalid ID deletion
- Server connection errors

## 🔍 Response Examples

### Successful Embedding Creation
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "model_name": "embeddinggemma:300m",
  "message": "Embedding created successfully"
}
```

### Embedding Retrieval
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "text": "Sample text for embedding",
  "model_name": "embeddinggemma:300m",
  "embedding": [0.1, 0.2, 0.3, ...],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Failed to create embedding"
}
```

## 💡 Usage Tips

### 1. About Models
- Default: `embeddinggemma:300m`
- First execution triggers model download (may take several minutes)
- Model specification via `model_name` parameter

### 2. About URI
- `uri` must be unique
- Resending with same URI updates existing data
- File paths, URLs, arbitrary identifiers - any data location identifier can be specified

### 3. Document Storage and Retrieval
- Original text is automatically stored along with embeddings
- Text is returned in all retrieval operations for reference
- Enables document reconstruction and content verification
- Useful for debugging and understanding embedding results

### 4. Text Limitations
- Long texts are also processable
- Multilingual support including Japanese
- Special characters and Unicode characters are processed

### 5. Port Configuration
- Default: Port 3001
- Changeable via `PORT` environment variable
- Watch for port conflicts with other applications

## 🐛 Troubleshooting

### Cannot Connect to Server
```bash
# Check if server is running
curl http://localhost:3001/

# Check port usage
lsof -i :3001

# Start EES server
nix run
```

### Slow Model Download
```bash
# Manually check Ollama service
ollama list

# Pre-download model
ollama pull embeddinggemma:300m
```

### Permission Errors
```bash
# Grant execute permission to scripts
chmod +x examples/*.sh
```

## 📚 References

- [EES API Documentation](../README.md)
- [Ollama Documentation](https://ollama.ai/)
- [Nix Flakes Guide](https://nixos.wiki/wiki/Flakes)