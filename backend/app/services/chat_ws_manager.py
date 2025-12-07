"""Chat WebSocket connection manager for room-based messaging."""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class ChatRoom:
    """Manages WebSocket connections for a single conversation."""

    conversation_id: UUID
    connections: dict[str, WebSocket] = field(default_factory=dict)  # user_id -> websocket
    # Track active TTS tasks for cancellation
    active_tts_tasks: dict[str, asyncio.Task] = field(default_factory=dict)  # user_id -> task

    def add_connection(self, user_id: str, websocket: WebSocket) -> None:
        """Add a user's WebSocket connection to the room."""
        self.connections[user_id] = websocket
        logger.debug(f"User {user_id} joined room {self.conversation_id}")

    def remove_connection(self, user_id: str) -> None:
        """Remove a user's WebSocket connection from the room."""
        if user_id in self.connections:
            del self.connections[user_id]
            logger.debug(f"User {user_id} left room {self.conversation_id}")
        # Cancel any active TTS task for this user
        self.cancel_tts(user_id)

    def cancel_tts(self, user_id: str) -> None:
        """Cancel active TTS streaming for a user."""
        if user_id in self.active_tts_tasks:
            task = self.active_tts_tasks[user_id]
            if not task.done():
                task.cancel()
                logger.debug(f"Cancelled TTS task for user {user_id}")
            del self.active_tts_tasks[user_id]

    def set_tts_task(self, user_id: str, task: asyncio.Task) -> None:
        """Track a TTS task for potential cancellation."""
        # Cancel any existing task first
        self.cancel_tts(user_id)
        self.active_tts_tasks[user_id] = task

    @property
    def is_empty(self) -> bool:
        """Check if the room has no connections."""
        return len(self.connections) == 0

    @property
    def user_count(self) -> int:
        """Get the number of connected users."""
        return len(self.connections)


class ChatWebSocketManager:
    """Global manager for all chat room WebSocket connections."""

    def __init__(self):
        self.rooms: dict[UUID, ChatRoom] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        conversation_id: UUID,
        user_id: str,
        websocket: WebSocket,
    ) -> ChatRoom:
        """
        Add a user to a chat room.

        Creates the room if it doesn't exist.
        Returns the ChatRoom instance.
        """
        async with self._lock:
            if conversation_id not in self.rooms:
                self.rooms[conversation_id] = ChatRoom(conversation_id=conversation_id)
                logger.info(f"Created chat room for conversation {conversation_id}")

            room = self.rooms[conversation_id]
            room.add_connection(user_id, websocket)
            logger.info(
                f"User {user_id} connected to room {conversation_id} "
                f"({room.user_count} users)"
            )
            return room

    async def disconnect(self, conversation_id: UUID, user_id: str) -> None:
        """
        Remove a user from a chat room.

        Cleans up empty rooms.
        """
        async with self._lock:
            if conversation_id not in self.rooms:
                return

            room = self.rooms[conversation_id]
            room.remove_connection(user_id)

            if room.is_empty:
                del self.rooms[conversation_id]
                logger.info(f"Removed empty chat room for conversation {conversation_id}")
            else:
                logger.info(
                    f"User {user_id} disconnected from room {conversation_id} "
                    f"({room.user_count} users remaining)"
                )

    async def send_to_user(
        self,
        conversation_id: UUID,
        user_id: str,
        message: dict[str, Any],
    ) -> bool:
        """
        Send a message to a specific user in a room.

        Returns True if sent successfully, False otherwise.
        """
        room = self.rooms.get(conversation_id)
        if not room:
            logger.warning(f"Room {conversation_id} not found")
            return False

        websocket = room.connections.get(user_id)
        if not websocket:
            logger.warning(f"User {user_id} not found in room {conversation_id}")
            return False

        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"Failed to send message to user {user_id}: {e}")
            return False

    async def broadcast(
        self,
        conversation_id: UUID,
        message: dict[str, Any],
        exclude_user: str | None = None,
    ) -> int:
        """
        Broadcast a message to all users in a room.

        Args:
            conversation_id: The conversation/room ID
            message: The message to broadcast
            exclude_user: Optional user_id to exclude from broadcast

        Returns:
            Number of users the message was sent to successfully
        """
        room = self.rooms.get(conversation_id)
        if not room:
            logger.warning(f"Room {conversation_id} not found for broadcast")
            return 0

        sent_count = 0
        failed_users = []

        for user_id, websocket in room.connections.items():
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await websocket.send_json(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to broadcast to user {user_id}: {e}")
                failed_users.append(user_id)

        # Clean up failed connections
        for user_id in failed_users:
            room.remove_connection(user_id)

        return sent_count

    def get_room(self, conversation_id: UUID) -> ChatRoom | None:
        """Get a chat room by conversation ID."""
        return self.rooms.get(conversation_id)

    def get_room_user_count(self, conversation_id: UUID) -> int:
        """Get the number of users in a room."""
        room = self.rooms.get(conversation_id)
        return room.user_count if room else 0


# Singleton instance
chat_ws_manager = ChatWebSocketManager()
