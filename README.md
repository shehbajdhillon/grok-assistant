# Grok Assistant

A simple chat application built with Python that uses Letta for agent loops and memory management. The application supports multiple personas (personal assistant, dating coach, friend, etc.) and remembers conversations across sessions.

## Features

- 🤖 **Agent Loop**: Powered by Letta SDK for intelligent conversation handling
- 🧠 **Memory Management**: Automatic conversation summarization and context retention
- 👤 **Multiple Personas**: Switch between different AI personas (personal assistant, dating coach, friend)
- 💬 **Conversation Memory**: Remembers past interactions and maintains context
- 🔌 **Extensible**: Designed to be easily extended to a web application

## Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) (fast Python package installer)
- Docker (for running Letta server)
- Ollama (for free embeddings)
- xAI API key (for Grok models)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd grok-assistant
```

2. Create a virtual environment and install dependencies:
```bash
# Using uv sync (recommended - automatically creates venv and installs dependencies)
uv sync

# Or manually:
uv venv --python 3.12
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

3. Set up environment variables in `.env` file:
   ```bash
   # Create a .env file in the project root
   cp .env.example .env
   # Then edit .env with your configuration (see below)
   ```

4. **Set up the self-hosted Letta server** (required):

   This application uses a **self-hosted Letta server** with xAI/Grok models and free Ollama embeddings.

   **a. Install and start Ollama** (for free embeddings):
   ```bash
   # Install Ollama (macOS)
   brew install ollama
   
   # Start Ollama service
   brew services start ollama
   
   # Pull an embedding model
   ollama pull all-minilm
   ```

   **b. Start the Letta server with Docker:**
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
   
   **Note:** If you need to restart the server later:
   ```bash
   docker restart letta-server
   ```

   **c. Configure your `.env` file:**
   ```bash
   # Letta server URL (defaults to localhost:8283)
   LETTA_API_URL=http://localhost:8283
   
   # Model configuration
   LETTA_MODEL=xai/grok-3-mini
   XAI_API_KEY=your_xai_api_key_here
   
   # Ollama configuration (for free embeddings)
   OLLAMA_API_URL=http://localhost:11434
   LETTA_OLLAMA_EMBEDDING_MODEL=all-minilm
   ```

**Available Models:**
- `xai/grok-3-mini` - Fast and cost-effective (recommended)
- `xai/grok-2-1212` - Latest full model
- Other xAI/Grok models supported by Letta

The application will automatically use the model specified in `LETTA_MODEL` when creating agents. You'll see a message showing which model is being used when you start the app.

## Usage

Run the chat application:
```bash
python chat_app.py
```

### Available Commands

- **Regular chat**: Just type your message and press Enter
- **`set_persona <name>`**: Switch to a different persona
  - Available personas: `personal_assistant`, `dating_coach`, `friend`
- **`memory`**: View the current conversation memory
- **`personas`**: List all available personas
- **`exit`** or **`quit`**: Exit the application

### Example Session

```
Welcome to the Chat Application!
============================================================

Available personas:
  - personal_assistant: A helpful personal assistant...
  - dating_coach: An empathetic dating coach...
  - friend: A casual, friendly companion...

Default persona set to: Personal Assistant

You: Hello!
Personal Assistant: Hello! How can I help you today?

You: set_persona dating_coach
✓ Persona switched to: Dating Coach
  An empathetic dating coach offering advice...

You: I'm nervous about a first date
Dating Coach: That's completely normal! First dates can be nerve-wracking...

You: memory
--- Conversation Memory ---
- User mentioned being nervous about first date
- Discussed strategies for managing first-date anxiety
--- End Memory ---
```

## Project Structure

```
grok-assistant/
├── chat_app.py          # Main chat application with CLI interface
├── personas.py          # Persona configurations and management
├── requirements.txt     # Python dependencies
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Personas

### Personal Assistant
A helpful and efficient assistant for daily tasks, scheduling, and productivity.

### Dating Coach
An empathetic coach offering advice on dating and relationships.

### Friend
A casual, friendly companion for everyday conversation.

## Extending to a Web Application

The application is designed to be easily extended to a web interface. Here's an example using Flask:

```python
from chat_app import ChatApplication
from flask import Flask, request, jsonify

app = Flask(__name__)
chat_app = ChatApplication()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    persona = data.get('persona')
    
    if persona:
        chat_app.set_persona(persona)
    
    response = chat_app.chat(user_input)
    return jsonify({"response": response, "persona": chat_app.current_persona})

@app.route('/personas', methods=['GET'])
def get_personas():
    from personas import PERSONAS
    return jsonify({"personas": PERSONAS})
```

For a more complete example, check out the [Letta Chatbot Example](https://github.com/letta-ai/letta-chatbot-example).

## Memory Management

The application uses Letta's memory management system:
- **Working Memory**: Retains the last 20 messages by default
- **Summarization**: Automatically summarizes conversations after 15 messages
- **Context Retention**: Maintains conversation context across interactions

## Future Enhancements

- Web interface (Flask/FastAPI)
- User authentication and session management
- Database storage for conversation history
- Additional personas
- Custom persona creation
- Multi-user support

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
