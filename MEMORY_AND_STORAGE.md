# Letta Memory and Storage Architecture

This document explains where conversations are stored and how Letta uses memory.

## Where Conversations Are Stored

### PostgreSQL Database (Inside Letta Server)

All conversation data is stored in a **PostgreSQL database** running inside the `letta-server` Docker container.

**Storage Location:**
- **Docker Volume**: `~/.letta/.persist/pgdata` (mounted to `/var/lib/postgresql/data` in container)
- **Database Name**: `letta`
- **Persistent**: Data persists even when containers are stopped/restarted

### Key Database Tables

1. **`messages`** - Stores all conversation messages
   - Columns: `id`, `agent_id`, `group_id`, `run_id`, `role`, `text`, `content`, `created_at`, etc.
   - Each message is linked to an `agent_id` and optionally a `group_id`

2. **`agents`** - Stores agent configurations
   - One agent per persona (e.g., "personal_assistant", "dating_coach")
   - **`system` column**: Stores the system prompt (persona instructions)
   - Contains model configuration (`llm_config`), embedding settings (`embedding_config`)
   - System prompts are set when creating agents and define the agent's behavior

3. **`groups`** - Stores conversation groups
   - Used for organizing messages into conversation threads
   - Maps to your `conversation_id` concept

4. **`block`** - Stores memory blocks
   - Persistent memory chunks that persist across conversations
   - Can be attached to agents or groups

5. **`archives`** and **`archival_passages`** - Stores summarized/archived memories
   - Long-term memory that's been compressed/summarized

## How Letta Uses Memory

Letta has a sophisticated multi-layered memory system:

### 1. **Working Memory** (Active Context)
- **What**: Current conversation messages
- **Where**: `messages` table, filtered by `group_id` (conversation thread)
- **Lifespan**: Active during conversation
- **Usage**: Immediate context for generating responses

### 2. **System Prompts** (Agent Behavior Definition)
- **What**: Instructions that define the agent's persona and behavior
- **Where**: `agents.system` column in PostgreSQL
- **Lifespan**: Permanent, tied to the agent
- **Usage**: Injected into every LLM call to define how the agent should behave
- **Source**: Defined in `backend/personas.py`, passed when creating agents
- **Example**: "You are a helpful and efficient personal assistant..."

### 3. **Memory Blocks** (Persistent Facts)
- **What**: Structured information blocks (e.g., persona instructions backup, user preferences)
- **Where**: `block` table, linked to agents via `blocks_agents`
- **Lifespan**: Permanent until explicitly updated/deleted
- **Usage**: Always available to the agent, regardless of conversation
- **Note**: System prompts are also stored as memory blocks (labeled "persona") for backup/reference
- **Example**: User's favorite color, important dates, custom instructions

### 4. **Recall Memory** (Semantic Search)
- **What**: Embeddings of past messages stored in `archival_passages`
- **Where**: Embeddings stored in vector database (PostgreSQL with pgvector extension)
- **Lifespan**: Long-term, automatically managed
- **Usage**: When agent needs to recall similar past conversations
- **How it works**:
  1. Messages are embedded using the configured embedding model (e.g., `ollama/all-minilm:latest`)
  2. Embeddings stored in `archival_passages` table
  3. When agent needs context, Letta performs semantic search
  4. Relevant past messages are retrieved and injected into context

### 5. **Archived Memory** (Summarized History)
- **What**: Compressed summaries of old conversations
- **Where**: `archives` table
- **Lifespan**: Permanent summaries
- **Usage**: Provides high-level context without using full context window

## Memory Flow Diagram

```
User Message
    ↓
[Letta Agent Processing]
    ↓
┌─────────────────────────────────────────┐
│ 1. System Prompt (agents.system)       │
│    - Persona instructions               │
│    - Defines agent behavior             │
│    - Always included in LLM context     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. Working Memory (messages table)     │
│    - Current conversation messages      │
│    - Filtered by group_id               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. Memory Blocks (block table)         │
│    - User preferences                   │
│    - Custom facts                       │
│    - Always available                   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. Recall Memory (archival_passages)   │
│    - Semantic search for similar       │
│      past conversations                │
│    - Uses embeddings                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. Archived Memory (archives)          │
│    - Summarized old conversations       │
│    - High-level context                │
└─────────────────────────────────────────┘
    ↓
[LLM Generates Response]
    ↓
[Response Stored in messages table]
    ↓
[Embeddings Created for Recall Memory]
```

## How Your Application Uses This

### Conversation Storage

1. **Sending a Message** (`POST /api/chat`):
   ```python
   # backend/chat_app.py:164
   response = self.client.agents.messages.create(
       agent_id=agent_id,
       input=user_input
   )
   ```
   - Message stored in `messages` table
   - Automatically linked to `agent_id` and `group_id`
   - Letta creates embeddings for recall memory

2. **Retrieving History** (`GET /api/conversation/history`):
   ```python
   # backend/chat_app.py:284
   messages_page = self.client.agents.messages.list(
       agent_id=agent_id,
       order=order,
       order_by="created_at"
   )
   ```
   - Fetches messages from `messages` table
   - Filtered by `agent_id` (and optionally `group_id`)

### System Prompt Management

1. **Setting System Prompt** (`set_persona`):
   ```python
   # backend/chat_app.py:62
   create_params = {
       "name": f"chat_agent_{persona_key}",
       "system": instructions  # System prompt from personas.py
   }
   agent = self.client.agents.create(**create_params)
   ```
   - System prompt stored in `agents.system` column
   - Defined in `backend/personas.py` for each persona
   - Also stored as a memory block (labeled "persona") for backup

2. **Viewing System Prompt**:
   ```sql
   SELECT system FROM agents WHERE name = 'chat_agent_personal_assistant';
   ```

### Memory Management

1. **Memory Blocks** (`GET /api/memory`):
   ```python
   # backend/chat_app.py:240
   memory_blocks = self.client.agents.blocks.list(agent_id=self.agent_id)
   ```
   - Retrieves persistent memory blocks for the agent
   - These are separate from conversation messages and system prompts

2. **Automatic Memory**:
   - Letta automatically:
     - Creates embeddings for messages
     - Stores them in recall memory
     - Summarizes old conversations into archives
     - Retrieves relevant past context when needed

## Key Concepts

### Agent ID vs Group ID vs Conversation ID

- **`agent_id`**: Identifies the agent (persona). One agent per persona, shared across all conversations with that persona.
- **`group_id`**: Letta's internal conversation thread identifier. Maps to your `conversation_id`.
- **`conversation_id`**: Your application's identifier for a conversation. Maps to Letta's `group_id`.

### Memory Scope

- **Per-Agent Memory**: Memory blocks attached to an agent are available to ALL conversations with that agent
- **Per-Conversation Memory**: Messages in a specific `group_id` are specific to that conversation
- **Cross-Conversation Memory**: Recall memory can retrieve relevant context from ANY past conversation with the same agent

## Viewing Storage Directly

You can inspect the database directly:

```bash
# Access PostgreSQL in Letta container
docker exec -it letta-server psql -U letta -d letta

# View recent messages
SELECT id, agent_id, group_id, role, LEFT(text, 50) as preview, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;

# View memory blocks
SELECT id, label, LEFT(value::text, 100) as preview 
FROM block 
LIMIT 10;

# View groups (conversations)
SELECT id, created_at 
FROM groups 
ORDER BY created_at DESC 
LIMIT 10;

# View system prompts
SELECT id, name, system 
FROM agents 
WHERE is_deleted = false;
```

## Summary

- **Storage**: PostgreSQL database in Docker volume (`~/.letta/.persist/pgdata`)
- **System Prompts**: Stored in `agents.system` column, define agent behavior
- **Messages**: Stored in `messages` table, organized by `group_id` (conversation)
- **Memory Blocks**: Persistent facts in `block` table, attached to agents
- **Recall Memory**: Embeddings in `archival_passages`, enables semantic search
- **Archives**: Summarized conversations in `archives` table
- **Automatic**: Letta handles embedding creation, summarization, and retrieval automatically

## System Prompt Details

### Where It's Stored
- **Primary**: `agents.system` column in PostgreSQL
- **Backup**: Also stored as a memory block (label: "persona") in `block` table

### How It's Set
1. Defined in `backend/personas.py` for each persona
2. Passed to Letta when creating agent: `client.agents.create(system=instructions)`
3. Stored permanently in the `agents` table

### How It's Used
- Injected into every LLM call as the system message
- Defines the agent's persona and behavior
- Persists across all conversations with that agent
- Cannot be changed without updating the agent (or creating a new one)

