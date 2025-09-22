# Docker-based CI E2E Testing Setup

## Overview

This document describes the Docker-based setup for running E2E tests in GitHub Actions CI environment. The setup ensures that all external service dependencies are available during testing.

## Architecture

### Services Required for E2E Tests

1. **Ollama** - Embedding model provider
   - Provides `nomic-embed-text` model for embeddings
   - Accessible at `http://localhost:11434`

2. **PostgreSQL** (optional) - Database service
   - Used for alternative database testing
   - In-memory SQLite is used by default

3. **Redis** (optional) - Caching service
   - For future caching implementations

## Docker Configuration

### `docker-compose.test.yml`

The test composition includes:
- **Ollama service** with health checks
- **Model setup service** to pull required models
- **Volume persistence** for model caching

### Key Features

- **Health checks** ensure services are ready before tests
- **Model pre-loading** during container setup
- **Volume sharing** for efficient model caching
- **Service isolation** with proper networking

## CI Pipeline Architecture

### Test Execution Flow

1. **Service Startup** (3-5 minutes)
   ```bash
   docker-compose -f docker-compose.test.yml up -d ollama
   ```

2. **Health Verification**
   ```bash
   timeout 180 bash -c 'until curl -f http://localhost:11434/api/version; do sleep 3; done'
   ```

3. **Model Loading**
   ```bash
   docker exec $(docker-compose ps -q ollama) ollama pull nomic-embed-text
   ```

4. **Test Execution**
   - **Unit tests**: `npm run test:unit` (fast, no external deps)
   - **E2E tests**: `npm run test:e2e` (with external services)

5. **Cleanup**
   ```bash
   docker-compose -f docker-compose.test.yml down -v
   ```

## Test Configuration

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `test` | Test environment mode |
| `EES_DATABASE_URL` | `:memory:` | In-memory SQLite database |
| `EES_PROVIDER` | `ollama` | Embedding provider selection |
| `EES_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama service endpoint |
| `EES_OLLAMA_DEFAULT_MODEL` | `nomic-embed-text` | Default embedding model |
| `CI` | `true` | CI environment detection |

### Vitest Configuration

Enhanced for CI environments:
- **30-second timeouts** for E2E operations
- **Single fork execution** to avoid service conflicts
- **Extended hook timeouts** for setup/teardown
- **Test isolation** with proper cleanup

## Performance Optimizations

### Model Caching

- **Docker volumes** persist downloaded models between runs
- **Health checks** prevent premature test execution
- **Model verification** ensures availability before testing

### Test Isolation

- **Separate test commands** for unit vs E2E tests
- **Resource cleanup** between test suites
- **Service readiness checks** before test execution

## Timeout Configuration

| Phase | Timeout | Reason |
|-------|---------|--------|
| Ollama startup | 180s | Model download time |
| Test execution | 20min | Complete E2E suite |
| Individual tests | 30s | Network operations |
| Service verification | 60s | Health check cycles |

## Monitoring and Debugging

### Service Health Checks

```bash
# Check Ollama status
curl http://localhost:11434/api/version

# List available models
curl http://localhost:11434/api/tags

# Check service logs
docker-compose -f docker-compose.test.yml logs ollama
```

### Test Debugging

```bash
# Run E2E tests locally with Docker
docker-compose -f docker-compose.test.yml up -d
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --include="**/embedding-lifecycle.e2e.test.ts"

# Run with verbose output
npm run test:e2e -- --reporter=verbose
```

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- npm packages installed

### Quick Start

1. **Start services**:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Wait for readiness**:
   ```bash
   timeout 180 bash -c 'until curl -f http://localhost:11434/api/version; do sleep 3; done'
   ```

3. **Run E2E tests**:
   ```bash
   export NODE_ENV=test
   export EES_DATABASE_URL=":memory:"
   export EES_PROVIDER=ollama
   export EES_OLLAMA_BASE_URL=http://localhost:11434
   export EES_OLLAMA_DEFAULT_MODEL=nomic-embed-text
   npm run test:e2e
   ```

4. **Cleanup**:
   ```bash
   docker-compose -f docker-compose.test.yml down -v
   ```

## Troubleshooting

### Common Issues

1. **Ollama service not ready**
   - Increase timeout in health checks
   - Verify Docker container logs
   - Check port availability (11434)

2. **Model not found**
   - Ensure model pull completed successfully
   - Verify model name matches configuration
   - Check Docker volume persistence

3. **Test timeouts**
   - Increase Vitest timeout configuration
   - Check service response times
   - Verify network connectivity

4. **Memory issues**
   - Monitor Docker container resource usage
   - Adjust container memory limits
   - Use single fork execution mode

### Performance Tips

- **Pre-warm models** in Docker build stage
- **Cache Docker layers** for faster builds
- **Use multi-stage builds** for optimized images
- **Parallel service startup** where possible

## Security Considerations

- **No persistent data** in CI environment
- **Isolated networks** for test containers
- **Cleanup on completion** to prevent resource leaks
- **Environment variable isolation** for credentials

## Future Improvements

1. **Matrix testing** with multiple model providers
2. **Parallel test execution** with service scaling
3. **Performance benchmarking** in CI pipeline
4. **Integration with monitoring** for service health
5. **Artifact collection** for test debugging