"""
Backend module for the Grok Assistant chat application.
"""

from .chat_app import ChatApplication
from .personas import PERSONAS, get_persona, get_persona_instructions, list_personas

__all__ = ['ChatApplication', 'PERSONAS', 'get_persona', 'get_persona_instructions', 'list_personas']

