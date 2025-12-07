#!/usr/bin/env python3
"""
Script to run the FastAPI server.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path so we can import backend modules
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", "8000"))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    print(f"Starting FastAPI server on {host}:{port}")
    print(f"API docs available at http://{host}:{port}/docs")
    print(f"Health check at http://{host}:{port}/health")
    
    # Run from project root with backend.api module path
    os.chdir(project_root)
    
    uvicorn.run(
        "backend.api:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
        reload_dirs=[str(backend_dir)]
    )

