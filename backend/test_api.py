#!/usr/bin/env python3
"""
Simple test script for the FastAPI endpoints.
Run this after starting the server to test the API.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint."""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_get_personas():
    """Test getting all personas."""
    print("Testing GET /api/personas...")
    response = requests.get(f"{BASE_URL}/api/personas")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_get_current_persona():
    """Test getting current persona."""
    print("Testing GET /api/personas/current...")
    response = requests.get(f"{BASE_URL}/api/personas/current")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_set_persona(persona_key: str):
    """Test setting a persona."""
    print(f"Testing POST /api/personas/set with persona: {persona_key}...")
    response = requests.post(
        f"{BASE_URL}/api/personas/set",
        json={"persona_key": persona_key}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_chat(message: str):
    """Test sending a chat message."""
    print(f"Testing POST /api/chat with message: '{message}'...")
    response = requests.post(
        f"{BASE_URL}/api/chat",
        json={"message": message}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_memory():
    """Test getting memory blocks."""
    print("Testing GET /api/memory...")
    response = requests.get(f"{BASE_URL}/api/memory")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("FastAPI Backend Test Suite")
    print("=" * 60)
    print()
    
    try:
        # Test health
        test_health()
        
        # Test personas
        test_get_personas()
        test_get_current_persona()
        
        # Test setting persona
        test_set_persona("friend")
        
        # Test chat
        test_chat("Hello! How are you?")
        
        # Test memory
        test_memory()
        
        print("=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server.")
        print("Make sure the FastAPI server is running:")
        print("  python backend/run_server.py")
    except Exception as e:
        print(f"Error: {e}")

