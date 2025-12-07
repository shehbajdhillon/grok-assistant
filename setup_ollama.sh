#!/bin/bash
# Setup script for Ollama (free embeddings)

echo "Installing Ollama..."
echo "Visit https://ollama.ai/download to download Ollama for macOS"
echo ""
echo "Or install via Homebrew:"
echo "  brew install ollama"
echo ""
echo "After installing, start Ollama:"
echo "  ollama serve"
echo ""
echo "Then pull a free embedding model:"
echo "  ollama pull nomic-embed-text"
echo ""
echo "Update your .env file:"
echo "  OLLAMA_API_URL=http://localhost:11434"
echo "  LETTA_EMBEDDING_MODEL=ollama/nomic-embed-text"
