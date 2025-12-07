# AI Companion Backend

FastAPI backend for AI Companion - a Jarvis-style AI assistant platform with long-term memory powered by Letta AI.

## Quick Start

### 1. Start Services (PostgreSQL + Letta)

```bash
# Set your OpenAI API key first
export OPENAI_API_KEY=sk-your-key-here

# Start Docker services
docker-compose up -d
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values:
# - CLERK_DOMAIN, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY (from Clerk dashboard)
# - OPENAI_API_KEY (for Letta)
```

### 4. Initialize Database

```bash
# Run migrations
alembic upgrade head

# Seed system assistants (optional - done automatically on startup)
python scripts/seed_db.py
```

### 5. Start Server

```bash
# Development mode with hot reload
uvicorn app.main:app --reload --port 8000

# Or
python -m app.main
```

The API will be available at http://localhost:8000

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## API Endpoints

### Assistants
- `GET /api/assistants` - List public assistants (discovery)
- `GET /api/assistants/me` - List your assistants
- `GET /api/assistants/{id}` - Get assistant details
- `POST /api/assistants` - Create assistant
- `PUT /api/assistants/{id}` - Update assistant
- `DELETE /api/assistants/{id}` - Delete assistant

### Conversations
- `GET /api/conversations` - List your conversations
- `GET /api/conversations/{id}` - Get conversation with messages
- `POST /api/conversations` - Start new conversation
- `DELETE /api/conversations/{id}` - Delete conversation

### Messages
- `POST /api/conversations/{id}/messages` - Send message & get AI response

### Users
- `GET /api/users/me` - Get your profile
- `PUT /api/users/me/preferences` - Update preferences

## Authentication

All endpoints require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings
│   ├── dependencies.py      # Dependency injection
│   ├── api/                 # Route handlers
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   ├── auth/                # Clerk JWT verification
│   └── db/                  # Database utilities
├── alembic/                 # Database migrations
├── scripts/                 # Utility scripts
└── tests/                   # Test suite
```

## Development

### Generate New Migration

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Run Tests

```bash
pytest
```
