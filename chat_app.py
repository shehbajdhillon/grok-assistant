"""
Simple chat application using Letta for agent loops and memory management.
Supports multiple personas and conversation memory.
"""

import os
from typing import Optional
from dotenv import load_dotenv
from letta_client import Letta
from personas import PERSONAS, get_persona, get_persona_instructions, list_personas

# Load environment variables from .env file
load_dotenv()


class ChatApplication:
    """Main chat application class with persona and memory management."""
    
    def __init__(self, api_url: Optional[str] = None, model: Optional[str] = None):
        """Initialize the chat application with Letta client (self-hosted only).
        
        Args:
            api_url: Letta server URL (defaults to LETTA_API_URL from .env or http://localhost:8283)
            model: LLM model to use (e.g., "xai/grok-3-mini", defaults to LETTA_MODEL env var or None)
        """
        api_url = api_url or os.getenv("LETTA_API_URL", "http://localhost:8283")
        model = model or os.getenv("LETTA_MODEL")
        
        # Always use self-hosted server (no API key needed)
        self.client = Letta(base_url=api_url)
        self.model = model
        self.agent_id: Optional[str] = None
        self.current_persona: Optional[str] = None
        
    def set_persona(self, persona_key: str) -> bool:
        """Set the active persona for the agent.
        
        Args:
            persona_key: Key of the persona to activate
            
        Returns:
            True if persona was set successfully, False otherwise
        """
        persona = get_persona(persona_key)
        if not persona:
            return False
        
        instructions = get_persona_instructions(persona_key)
        
        # Create agent with memory block for the persona, or update existing one
        if not self.agent_id:
            # Create agent with optional model specification
            create_params = {"name": f"chat_agent_{persona_key}"}
            if self.model:
                # Handle different model formats
                model_str = self.model
                # If using xai/grok format, try to use OpenRouter (supported provider)
                if model_str.startswith("xai/") or "grok" in model_str.lower():
                    # Check if OpenRouter is configured
                    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
                    if openrouter_api_key:
                        # Use OpenRouter format: openrouter/xai/grok-3-mini
                        if not model_str.startswith("openrouter/"):
                            model_str = model_str.replace("xai/", "openrouter/xai/")
                    else:
                        # If no OpenRouter key, try direct format
                        # Note: This may fail if xai provider is not configured on Letta server
                        pass
                
                create_params["model"] = model_str
                # Set embedding model - required by Letta
                # Try to use free/local options first, then fall back to OpenAI
                embedding_model = os.getenv("LETTA_EMBEDDING_MODEL")
                if not embedding_model:
                    # Use Ollama for free embeddings (self-hosted setup)
                    ollama_url = os.getenv("OLLAMA_API_URL") or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
                    # Use Ollama embedding model (free, runs locally)
                    # Letta expects format: ollama/model-name:latest
                    ollama_model = os.getenv("LETTA_OLLAMA_EMBEDDING_MODEL", "all-minilm")
                    # Ensure it has the ollama/ prefix and :latest suffix
                    if not ollama_model.startswith("ollama/"):
                        embedding_model = f"ollama/{ollama_model}"
                    else:
                        embedding_model = ollama_model
                    # Add :latest if not present
                    if ":latest" not in embedding_model:
                        embedding_model = f"{embedding_model}:latest"
                
                create_params["embedding"] = embedding_model
                # Set context window limit for Grok models (they have large context windows)
                if "grok" in model_str.lower():
                    create_params["context_window_limit"] = int(os.getenv("LETTA_CONTEXT_WINDOW_LIMIT", "30000"))
            
            agent = self.client.agents.create(**create_params)
            self.agent_id = agent.id
            # Create memory block for the persona and attach to agent
            block = self.client.blocks.create(
                label="persona",
                value=instructions,
                entity_id=self.agent_id
            )
        else:
            # Update existing agent's memory blocks with new persona
            try:
                # Try to find and update existing persona block
                blocks = self.client.agents.blocks.list(agent_id=self.agent_id)
                persona_block = next((b for b in blocks if b.label == "persona"), None)
                if persona_block:
                    self.client.agents.blocks.update(
                        block_id=persona_block.id,
                        agent_id=self.agent_id,
                        value=instructions
                    )
                else:
                    # Create new block if it doesn't exist
                    block = self.client.blocks.create(
                        label="persona",
                        value=instructions,
                        entity_id=self.agent_id
                    )
            except Exception:
                # If update fails, create a new memory block
                block = self.client.blocks.create(
                    label="persona",
                    value=instructions,
                    entity_id=self.agent_id
                )
        
        self.current_persona = persona_key
        return True
    
    def chat(self, user_input: str) -> str:
        """Process user input and generate a response.
        
        Args:
            user_input: The user's message
            
        Returns:
            The agent's response
        """
        if not self.agent_id:
            return "Please select a persona first using 'set_persona <persona_name>'"
        
        try:
            response = self.client.agents.messages.create(
                agent_id=self.agent_id,
                input=user_input
            )
        except Exception as e:
            return f"Error communicating with Letta: {str(e)}"
        
        # Extract the response content from the Letta response
        # The response is a LettaResponse object with messages array
        try:
            # Check if response has messages attribute
            if hasattr(response, 'messages') and response.messages:
                # Get the last assistant message (skip reasoning messages)
                for msg in reversed(response.messages):
                    # Check message type - we want assistant_message, not reasoning_message
                    msg_type = getattr(msg, 'message_type', None) or getattr(msg, 'type', None)
                    if msg_type == 'assistant_message' or (hasattr(msg, 'content') and msg_type != 'reasoning_message'):
                        # Get content from assistant message
                        content = getattr(msg, 'content', None)
                        if content:
                            return str(content)
                        # Fallback to other content fields
                        text = getattr(msg, 'text', None)
                        if text:
                            return str(text)
                        message = getattr(msg, 'message', None)
                        if message:
                            return str(message)
                
                # If no assistant_message found, try any message with content
                for msg in reversed(response.messages):
                    content = getattr(msg, 'content', None)
                    if content:
                        return str(content)
            
            # Check for direct content fields on response object
            content = getattr(response, 'content', None)
            if content:
                return str(content)
            
            # Last resort: return string representation (shouldn't happen)
            return f"[Unable to extract response. Response type: {type(response).__name__}]"
            
        except Exception as e:
            return f"Error processing response: {str(e)}"
    
    def get_memory_blocks(self) -> list:
        """Retrieve agent's memory blocks.
        
        Returns:
            List of memory blocks
        """
        if not self.agent_id:
            return []
        
        try:
            memory_blocks = self.client.agents.blocks.list(agent_id=self.agent_id)
            return memory_blocks
        except Exception:
            return []
    
    def display_memory(self):
        """Display current memory blocks."""
        memory_blocks = self.get_memory_blocks()
        if memory_blocks:
            print("\n--- Agent Memory Blocks ---")
            for block in memory_blocks:
                print(f"Label: {block.label}")
                value = block.value if hasattr(block, 'value') else str(block)
                print(f"Value: {value[:200]}..." if len(str(value)) > 200 else f"Value: {value}")
                print()
            print("--- End Memory ---\n")
        else:
            print("No memory blocks stored yet.\n")


def main():
    """Main CLI interface for the chat application."""
    print("=" * 60)
    print("Welcome to the Chat Application!")
    print("=" * 60)
    print("\nAvailable personas:")
    for key, persona in PERSONAS.items():
        print(f"  - {key}: {persona['description']}")
    print("\nCommands:")
    print("  'set_persona <name>' - Switch to a different persona")
    print("  'memory' - View conversation memory")
    print("  'personas' - List all available personas")
    print("  'exit' or 'quit' - Exit the application")
    print("=" * 60)
    print()
    
    try:
        # Initialize the chat application
        app = ChatApplication()
        
        # Show model info if configured
        if app.model:
            print(f"🤖 Model: {app.model}\n")
        
        # Default to personal_assistant if no selection
        default_persona = "personal_assistant"
        if app.set_persona(default_persona):
            print(f"Default persona set to: {PERSONAS[default_persona]['name']}\n")
        else:
            print("Failed to initialize default persona.\n")
            return
    except Exception as e:
        print(f"\nConfiguration Error: {e}")
        print("\nMake sure your Letta server is running:")
        print("  docker run -d --name letta-server \\")
        print("    -v ~/.letta/.persist/pgdata:/var/lib/postgresql/data \\")
        print("    -p 8283:8283 \\")
        print("    -e XAI_API_KEY=your_xai_key \\")
        print("    -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \\")
        print("    letta/letta:latest")
        print("\nAnd ensure Ollama is running:")
        print("  ollama serve")
        return
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() in ["exit", "quit"]:
                print("\nGoodbye! Thanks for chatting!")
                break
            
            elif user_input.lower() == "memory":
                app.display_memory()
                continue
            
            elif user_input.lower() == "personas":
                print("\nAvailable personas:")
                for key, persona in PERSONAS.items():
                    marker = " (current)" if app.current_persona == key else ""
                    print(f"  - {key}: {persona['name']}{marker}")
                print()
                continue
            
            elif user_input.lower().startswith("set_persona"):
                parts = user_input.split()
                if len(parts) < 2:
                    print("Usage: set_persona <persona_name>")
                    print(f"Available: {', '.join(list_personas())}\n")
                    continue
                
                persona_key = parts[1]
                if app.set_persona(persona_key):
                    persona = get_persona(persona_key)
                    print(f"\n✓ Persona switched to: {persona['name']}")
                    print(f"  {persona['description']}\n")
                else:
                    print(f"\n✗ Persona '{persona_key}' not found.")
                    print(f"Available personas: {', '.join(list_personas())}\n")
                continue
            
            # Process regular chat input
            response = app.chat(user_input)
            persona_name = PERSONAS[app.current_persona]['name'] if app.current_persona else "Assistant"
            print(f"{persona_name}: {response}\n")
            
        except KeyboardInterrupt:
            print("\n\nGoodbye! Thanks for chatting!")
            break
        except Exception as e:
            print(f"\nError: {e}\n")
            print("Please try again or type 'exit' to quit.\n")


if __name__ == "__main__":
    main()

