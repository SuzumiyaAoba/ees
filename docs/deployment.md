# EES Deployment Guide

This guide provides comprehensive instructions for deploying the EES (Embedding Engine Service) in production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Nix Deployment](#nix-deployment)
- [Environment Configuration](#environment-configuration)
- [Data Persistence](#data-persistence)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

Before deploying EES, ensure you have the following installed:

- **Docker Deployment**: Docker Engine 20.10+ and Docker Compose 2.0+
- **Nix Deployment**: Nix package manager with flakes enabled
- **Hardware Requirements**:
  - Minimum: 2GB RAM, 10GB disk space
  - Recommended: 4GB+ RAM, 20GB+ disk space (for Ollama models)

## Docker Deployment

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/SuzumiyaAoba/ees.git
cd ees
```

2. **Configure environment variables:**
```bash
cp .env.production .env
# Edit .env with your configuration
```

3. **Start services with Docker Compose:**
```bash
docker-compose up -d
```

4. **Check service status:**
```bash
docker-compose ps
```

5. **View logs:**
```bash
docker-compose logs -f ees-api
```

6. **Verify API is running:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-01T00:00:00.000Z"}
```

### Production Deployment Options

#### Option 1: Docker Compose (Recommended for single-server deployment)

The `docker-compose.yml` file provides a complete production setup with:
- EES API server
- Ollama embedding service
- Automatic model initialization
- Volume persistence
- Health checks

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# Update to latest version
docker-compose pull
docker-compose up -d
```

#### Option 2: Docker Container Only

If you're using an external Ollama instance or different provider:

```bash
# Build image
docker build -t ees:latest .

# Run container
docker run -d \
  --name ees-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e EES_PROVIDER=ollama \
  -e EES_OLLAMA_BASE_URL=http://your-ollama-host:11434 \
  -v $(pwd)/data:/app/data \
  ees:latest
```

### Docker Configuration

#### Service Architecture

The Docker Compose setup includes three services:

1. **ees-api**: The main EES API server
   - Exposes port 3000
   - Depends on Ollama service
   - Persists data in `ees-data` volume
   - Health check endpoint: `/health`

2. **ollama**: Embedding model service
   - Exposes port 11434
   - Stores models in `ollama-data` volume
   - Health check: `ollama list` command

3. **ollama-init**: One-time model initialization
   - Pulls the `nomic-embed-text` model
   - Runs once and exits

#### Volume Management

Data is persisted in Docker volumes:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect ees-data
docker volume inspect ollama-data

# Backup data
docker run --rm -v ees-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/ees-data-backup.tar.gz -C /data .

# Restore data
docker run --rm -v ees-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/ees-data-backup.tar.gz -C /data
```

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose build --no-cache
docker-compose up -d

# Verify update
docker-compose logs -f ees-api
curl http://localhost:3000/health
```

## Nix Deployment

### Quick Start with Nix Flakes

Nix provides reproducible, declarative deployments with all dependencies included.

#### Option 1: Run directly from GitHub

```bash
# Run latest version directly
nix run github:SuzumiyaAoba/ees

# Run specific version/branch
nix run github:SuzumiyaAoba/ees/main
```

#### Option 2: Local development and deployment

```bash
# Clone repository
git clone https://github.com/SuzumiyaAoba/ees.git
cd ees

# Enter development environment
nix develop

# Build application
nix build

# Run built application
./result/bin/ees-api
```

#### Option 3: Development server with hot reload

```bash
nix run .#dev
```

### NixOS System Integration

For NixOS users, you can integrate EES as a system service:

```nix
# /etc/nixos/configuration.nix
{
  # Import EES flake
  inputs.ees.url = "github:SuzumiyaAoba/ees";

  # Configure service (example - not yet implemented)
  services.ees = {
    enable = true;
    port = 3000;
    provider = "ollama";
    databasePath = "/var/lib/ees/embeddings.db";
    environmentFile = "/etc/ees/environment";
  };
}
```

**Note**: NixOS module is not yet implemented. This is a future enhancement.

### Nix Deployment Benefits

- **Reproducible**: Exact same dependencies across all deployments
- **Isolated**: No conflicts with system packages
- **Declarative**: Configuration as code
- **Cross-platform**: Works on Linux and macOS
- **Rollback**: Easy to revert to previous versions

## Environment Configuration

### Configuration File

Copy the production template and customize:

```bash
cp .env.production .env
```

### Essential Configuration

#### Provider Selection

Choose your embedding provider:

```bash
# Ollama (default, self-hosted)
EES_PROVIDER=ollama
EES_OLLAMA_BASE_URL=http://localhost:11434
EES_OLLAMA_DEFAULT_MODEL=nomic-embed-text

# OpenAI (requires API key)
EES_PROVIDER=openai
EES_OPENAI_API_KEY=sk-...
EES_OPENAI_DEFAULT_MODEL=text-embedding-3-small

# Google AI (requires API key)
EES_PROVIDER=google
EES_GOOGLE_API_KEY=...
EES_GOOGLE_DEFAULT_MODEL=text-embedding-004
```

#### Database Configuration

```bash
# Local file database (default)
EES_DATABASE_URL=./data/embeddings.db

# Custom location
EES_DATABASE_URL=/var/lib/ees/embeddings.db
```

#### Logging & Observability

```bash
# Production logging
LOG_LEVEL=info              # debug, info, warn, error
LOG_PRETTY=false            # Structured JSON logs
SERVICE_NAME=ees-api
SERVICE_VERSION=1.0.0
DEPLOYMENT_ENVIRONMENT=production
```

### Environment Variables Reference

See `.env.production` for complete configuration options including:
- All provider configurations (Ollama, OpenAI, Google, Cohere, Mistral, Azure)
- Security settings (CORS, API keys)
- Performance tuning options
- Database connection settings

## Data Persistence

### Docker Volumes

Data is stored in named volumes:

- `ees-data`: Database and application data
- `ollama-data`: Ollama models and cache

### Backup Strategy

#### Database Backup

```bash
# Backup database
docker cp ees-api:/app/data/embeddings.db ./backup/

# Restore database
docker cp ./backup/embeddings.db ees-api:/app/data/
docker-compose restart ees-api
```

#### Full Volume Backup

```bash
# Backup all data
docker run --rm \
  -v ees-data:/ees-data \
  -v ollama-data:/ollama-data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/ees-backup-$(date +%Y%m%d).tar.gz \
    -C /ees-data . -C /ollama-data .

# Restore
docker run --rm \
  -v ees-data:/ees-data \
  -v ollama-data:/ollama-data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/ees-backup-YYYYMMDD.tar.gz \
    -C /ees-data -C /ollama-data
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-01T00:00:00.000Z"
}
```

### Docker Health Checks

Health checks are configured automatically:

```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' ees-api | jq
```

### Monitoring Service Status

```bash
# Docker Compose status
docker-compose ps

# View logs
docker-compose logs -f

# Check resource usage
docker stats ees-api ees-ollama
```

### Log Analysis

```bash
# View API logs
docker-compose logs ees-api

# Follow logs in real-time
docker-compose logs -f ees-api

# Filter by log level (with jq)
docker-compose logs ees-api | jq 'select(.level=="error")'
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptom**: Container exits immediately

**Solutions**:
```bash
# Check logs
docker-compose logs ees-api

# Verify environment variables
docker-compose config

# Check port availability
lsof -i :3000
```

#### 2. Ollama Connection Failed

**Symptom**: `ProviderConnectionError: Failed to connect to Ollama`

**Solutions**:
```bash
# Check Ollama service status
docker-compose logs ollama

# Verify Ollama is healthy
docker-compose ps ollama

# Test Ollama directly
curl http://localhost:11434/api/tags

# Restart Ollama
docker-compose restart ollama
```

#### 3. Model Not Found

**Symptom**: `ProviderModelError: Model not found`

**Solutions**:
```bash
# Check available models
docker exec ees-ollama ollama list

# Pull model manually
docker exec ees-ollama ollama pull nomic-embed-text

# Restart initialization
docker-compose up ollama-init
```

#### 4. Database Locked

**Symptom**: `DatabaseError: database is locked`

**Solutions**:
```bash
# Stop all services
docker-compose down

# Remove lock file
docker volume inspect ees-data
# Manually remove .db-wal and .db-shm files if present

# Restart services
docker-compose up -d
```

#### 5. Out of Memory

**Symptom**: Container crashes, OOM errors

**Solutions**:
```bash
# Increase Docker memory limit
# Edit Docker Desktop settings or add to docker-compose.yml:
services:
  ees-api:
    deploy:
      resources:
        limits:
          memory: 2G

# Restart services
docker-compose up -d
```

### Debug Mode

Enable debug logging:

```bash
# Edit .env or docker-compose.yml
LOG_LEVEL=debug

# Restart services
docker-compose restart ees-api

# View debug logs
docker-compose logs -f ees-api
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check database size
docker exec ees-api ls -lh /app/data/

# Optimize database (if needed)
docker exec ees-api sqlite3 /app/data/embeddings.db "VACUUM;"
```

## Security Considerations

### Production Security Checklist

- [ ] **Use environment variables** for sensitive configuration (API keys, secrets)
- [ ] **Never commit** `.env` files to version control
- [ ] **Enable CORS** with specific origins (not `*`)
- [ ] **Use HTTPS** in production (reverse proxy with TLS)
- [ ] **Regular updates** - Keep Docker images and dependencies updated
- [ ] **Network isolation** - Use Docker networks to isolate services
- [ ] **Resource limits** - Configure memory and CPU limits
- [ ] **Regular backups** - Automated backup strategy for data
- [ ] **Monitor logs** - Set up log aggregation and alerting
- [ ] **API authentication** - Implement API key or OAuth (if handling sensitive data)

### Reverse Proxy with TLS

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Security Hardening

The provided Dockerfile implements security best practices:

- ✅ Non-root user (nodejs:1001)
- ✅ Minimal base image (Alpine)
- ✅ Multi-stage build (smaller attack surface)
- ✅ Production dependencies only
- ✅ Proper signal handling (dumb-init)
- ✅ Health checks configured

Additional hardening:

```yaml
# docker-compose.yml
services:
  ees-api:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

## Support & Additional Resources

- **GitHub Repository**: https://github.com/SuzumiyaAoba/ees
- **Issue Tracker**: https://github.com/SuzumiyaAoba/ees/issues
- **API Documentation**: See `README.md` for API endpoint reference
- **CLI Documentation**: Run `ees --help` for CLI usage

For questions or issues, please open an issue on GitHub.
