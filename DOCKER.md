# Docker Setup for Grok Assistant

This guide explains how to run the Grok Assistant backend using Docker.

## Prerequisites

- Docker and Docker Compose installed
- `.env` file configured in the project root (see README.md)

## Quick Start

### Using Docker Compose (Recommended)

Docker Compose will start both the Letta server and the backend:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

The backend will be available at `http://localhost:8000`

### Building and Running Manually

#### 1. Build the Backend Image

```bash
docker build -f backend/Dockerfile -t grok-assistant-backend .
```

#### 2. Run the Backend Container

```bash
docker run -d \
  --name grok-assistant-backend \
  -p 8000:8000 \
  --env-file .env \
  -e LETTA_API_URL=http://host.docker.internal:8283 \
  grok-assistant-backend
```

**Note:** Make sure the Letta server is running separately (see README.md).

## Environment Variables

Environment variables are loaded from `backend/.env` file. Create this file with:

```bash
# backend/.env
LETTA_API_URL=http://localhost:8283
LETTA_MODEL=xai/grok-3-mini
XAI_API_KEY=your_xai_api_key_here
OLLAMA_API_URL=http://localhost:11434
LETTA_OLLAMA_EMBEDDING_MODEL=all-minilm
API_PORT=8000
API_HOST=0.0.0.0
```

**Note:** The `docker-compose.yml` automatically loads `backend/.env` for both services.

## Development vs Production

### Development (with hot reload)

The `docker-compose.yml` is configured for development with hot reload enabled. Code changes will automatically restart the server.

### Production

For production, use `Dockerfile.prod`:

```bash
docker build -f backend/Dockerfile.prod -t grok-assistant-backend:prod .
```

Or modify `docker-compose.yml` to remove the `--reload` flag and volume mounts.

## Troubleshooting

### Backend can't connect to Letta server

If running Letta server separately (not via docker-compose):
- Use `http://host.docker.internal:8283` as `LETTA_API_URL` (macOS/Windows)
- Use `http://172.17.0.1:8283` on Linux, or use the host's IP address

### Backend can't connect to Ollama

Ollama typically runs on the host machine. Use:
- `http://host.docker.internal:11434` (macOS/Windows)
- `http://172.17.0.1:11434` on Linux

### View logs

```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just Letta
docker-compose logs -f letta-server
```

### Restart services

```bash
docker-compose restart backend
docker-compose restart letta-server
```

## Network Configuration

The `docker-compose.yml` creates a bridge network (`grok-assistant-network`) that allows:
- Backend to communicate with Letta server using service name (`letta-server:8283`)
- Both services to access host services via `host.docker.internal`

