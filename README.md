# Grok Assistant

A chat application built with Python (FastAPI backend) and Next.js (frontend) that uses Letta for agent loops and memory management. The application supports multiple personas (personal assistant, dating coach, friend, etc.) and remembers conversations across sessions.

## Features

- 🤖 **Agent Loop**: Powered by Letta SDK for intelligent conversation handling
- 🧠 **Memory Management**: Automatic conversation summarization and context retention
- 👤 **Multiple Personas**: Switch between different AI personas (personal assistant, dating coach, friend)
- 💬 **Conversation Memory**: Remembers past interactions and maintains context
- 🌐 **Web Interface**: Modern Next.js frontend with FastAPI backend
- 🔌 **REST API**: Full REST API for integration and extensibility

## Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) (fast Python package installer)
- Node.js 18+ and npm (for frontend)
- Docker (for running Letta server)
- Ollama (for free embeddings)
- xAI API key (for Grok models)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd grok-assistant
```

### 2. Backend Setup

**a. Create virtual environment and install dependencies:**

```bash
# Using uv sync (recommended - automatically creates venv and installs dependencies)
uv sync

# Or manually:
uv venv --python 3.12
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r backend/requirements.txt
```

**b. Set up environment variables:**

Create a `.env` file in the project root:

```bash
# Letta server URL (defaults to localhost:8283)
LETTA_API_URL=http://localhost:8283

# Model configuration
LETTA_MODEL=xai/grok-3-mini
XAI_API_KEY=your_xai_api_key_here

# Ollama configuration (for free embeddings)
OLLAMA_API_URL=http://localhost:11434
LETTA_OLLAMA_EMBEDDING_MODEL=all-minilm

# API server port (optional, defaults to 8000)
API_PORT=8000
```

**c. Install and start Ollama (for free embeddings):**

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
brew services start ollama

# Pull an embedding model
ollama pull all-minilm
```

**d. Start the Letta server with Docker:**

```bash
# If a container already exists, stop and remove it first:
docker stop letta-server 2>/dev/null && docker rm letta-server 2>/dev/null

# Start the Letta server
docker run -d --name letta-server \
  -v ~/.letta/.persist/pgdata:/var/lib/postgresql/data \
  -p 8283:8283 \
  -e XAI_API_KEY=your_xai_api_key_here \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  letta/letta:latest
```

**Note:** To restart the server later:
```bash
docker restart letta-server
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

**Optional:** Create `frontend/.env.local` to customize API URL:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Quick Start (Full Stack)

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd /path/to/grok-assistant
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python backend/run_server.py
```

The backend will start on `http://localhost:8000` with API docs at `http://localhost:8000/docs`.

**Terminal 2 - Frontend:**
```bash
cd /path/to/grok-assistant/frontend
npm run dev
```

The frontend will start on `http://localhost:3000`.

**Open your browser:** Navigate to `http://localhost:3000` to use the application.

### CLI Application (Backend Only)

You can also run the backend as a CLI application:

```bash
# From the project root
python -m backend.chat_app

# Or if you're in the backend directory
cd backend
python chat_app.py
```

**Available Commands:**
- **Regular chat**: Just type your message and press Enter
- **`set_persona <name>`**: Switch to a different persona
  - Available personas: `personal_assistant`, `dating_coach`, `friend`
- **`memory`**: View the current conversation memory
- **`personas`**: List all available personas
- **`exit`** or **`quit`**: Exit the application

## API Documentation

The FastAPI backend provides REST API endpoints for frontend integration and external use.

### Base URL
- **Development**: `http://localhost:8000`
- **Interactive Docs**: `http://localhost:8000/docs`

### Endpoints

#### Health Check
- `GET /health` - Check server status and configuration

#### Personas
- `GET /api/personas` - Get all available personas
- `GET /api/personas/current` - Get the current active persona
- `POST /api/personas/set` - Set the active persona
  ```json
  {
    "persona_key": "personal_assistant"
  }
  ```

#### Chat
- `POST /api/chat` - Send a chat message and get a response
  ```json
  {
    "message": "Hello! How are you?",
    "conversation_id": "conv-123"
  }
  ```
  - `conversation_id`: **Required** - Identifies which conversation this message belongs to

#### Conversation History
- `GET /api/conversation/history` - Get conversation history for a specific conversation
  - Query parameters:
    - `conversation_id` (required): The conversation ID to fetch history for
    - `limit` (optional): Maximum number of messages to retrieve
    - `order` (optional): `'asc'` for oldest first, `'desc'` for newest first (default: `'desc'`)

#### Memory
- `GET /api/memory` - Get the agent's memory blocks

#### Agent Information
- `GET /api/agent/id` - Get the current agent ID (for debugging)

### Example API Calls

```bash
# Health check
curl http://localhost:8000/health

# Get personas
curl http://localhost:8000/api/personas

# Send a chat message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "conversation_id": "conv-123"}'

# Get conversation history
curl "http://localhost:8000/api/conversation/history?conversation_id=conv-123&limit=10&order=desc"
```

## Understanding IDs and Architecture

### Conversation ID (`conversation_id`)
- **Primary identifier** - Use this to identify and fetch conversations
- Each conversation has a unique `conversation_id` (you provide this, e.g., `conv-123` or UUID)
- Pass `conversation_id` when sending messages to maintain conversation context
- Use `conversation_id` to fetch messages from a specific conversation

### Agent ID (`agent_id`)
- **Shared across conversations** - One agent per persona, not per conversation
- Created when you set a persona (e.g., one agent for "personal_assistant")
- **All conversations with the same persona share the same agent**
- Used internally by Letta - you don't need separate agents for each conversation
- Conversations are separated by `conversation_id`/`group_id`, not by `agent_id`

**Example:**
```
Persona: "personal_assistant"
  └── Agent ID: agent-xxx (ONE agent)
      ├── Conversation 1 (conv-123) → Messages filtered by group_id
      ├── Conversation 2 (conv-456) → Messages filtered by group_id
      └── Conversation 3 (conv-789) → Messages filtered by group_id
```

### Group ID (`group_id`)
- **Letta's internal parameter** - Used for filtering messages in Letta's API
- You typically don't need to use `group_id` directly - just use `conversation_id` and the backend handles the mapping
- The backend maps your `conversation_id` to Letta's `group_id` when fetching history

## Available Models

- `xai/grok-3-mini` - Fast and cost-effective (recommended)
- `xai/grok-2-1212` - Latest full model
- Other xAI/Grok models supported by Letta

The application will automatically use the model specified in `LETTA_MODEL` when creating agents.

## Personas

### Personal Assistant
A helpful and efficient assistant for daily tasks, scheduling, and productivity.

### Dating Coach
An empathetic coach offering advice on dating and relationships.

### Friend
A casual, friendly companion for everyday conversation.

## Project Structure

```
grok-assistant/
├── backend/
│   ├── __init__.py          # Backend package initialization
│   ├── chat_app.py          # Main chat application with CLI interface
│   ├── personas.py          # Persona configurations and management
│   ├── api.py               # FastAPI REST API server
│   ├── run_server.py        # Script to run the FastAPI server
│   ├── requirements.txt    # Python dependencies
│   ├── AGENT_ARCHITECTURE.md # Agent architecture documentation
│   └── .env.example         # Environment variables template
├── frontend/                # Next.js frontend application
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── hooks/               # React hooks
│   ├── lib/                 # Utilities and API client
│   └── types/               # TypeScript type definitions
├── .env                     # Environment variables (not in git)
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Troubleshooting

### Backend Issues

**Backend won't start:**
- Check if Letta server is running: `docker ps | grep letta`
- Check if port 8000 is available: `lsof -i :8000`
- Verify `.env` file exists and has correct values
- Check backend logs for errors

**Letta connection errors:**
- Verify Letta server is running: `docker ps | grep letta`
- Check `LETTA_API_URL` in `.env` matches your Docker container port
- Restart Letta server: `docker restart letta-server`

**Embedding model errors:**
- Ensure Ollama is running: `brew services list | grep ollama`
- Verify embedding model is pulled: `ollama list | grep all-minilm`
- Check `OLLAMA_API_URL` and `LETTA_OLLAMA_EMBEDDING_MODEL` in `.env`

### Frontend Issues

**Frontend won't start:**
- Run `npm install` in the frontend directory
- Check if port 3000 is available: `lsof -i :3000`
- Check Node.js version: `node --version` (should be 18+)

**Frontend can't connect to backend:**
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/api.py`
- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (if set)
- Check browser console for detailed error messages

**"Setting up assistant" stuck:**
- Check browser console for errors
- Verify backend is running and accessible
- Check that persona API endpoint is working: `curl http://localhost:8000/api/personas/current`

### General Issues

**Port already in use:**
```bash
# Find and kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Find and kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

**Docker container issues:**
```bash
# Stop and remove container
docker stop letta-server
docker rm letta-server

# View logs
docker logs letta-server

# Restart container
docker restart letta-server
```

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (Next.js default)
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

To add more origins, edit `backend/api.py` and update the `allow_origins` list in the CORS middleware configuration.

## Memory Management

The application uses Letta's memory management system:
- **Working Memory**: Retains the last 20 messages by default
- **Summarization**: Automatically summarizes conversations after 15 messages
- **Context Retention**: Maintains conversation context across interactions

## Development

### Running Tests

```bash
# Test backend API (ensure server is running first)
python backend/test_api.py
```

### Stopping Services

- **Backend**: Press `Ctrl+C` in Terminal 1
- **Frontend**: Press `Ctrl+C` in Terminal 2
- **Letta**: `docker stop letta-server`

## Future Enhancements

- User authentication and session management
- Database storage for conversation history
- Additional personas
- Custom persona creation
- Multi-user support
- Conversation export/import

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
