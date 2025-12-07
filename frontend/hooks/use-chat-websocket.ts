'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message } from '@/types';
import { PCMAudioPlayer } from '@/lib/pcm-audio-player';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://grok-assistant-production.up.railway.app';

// Reconnection settings
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds to receive pong

interface UseChatWebSocketOptions {
  conversationId: string;
  voiceEnabled: boolean;
  onUserMessage: (message: Message) => void;
  onAssistantMessage: (message: Message) => void;
  onError: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseChatWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isPlaying: boolean;
  sendMessage: (content: string) => void;
  stopAudio: () => void;
  reconnect: () => void;
}

export function useChatWebSocket({
  conversationId,
  voiceEnabled,
  onUserMessage,
  onAssistantMessage,
  onError,
  onConnectionChange,
}: UseChatWebSocketOptions): UseChatWebSocketReturn {
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PCMAudioPlayer | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceEnabledRef = useRef(voiceEnabled);

  // Keep voiceEnabled ref in sync
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;

    // If voice is disabled, stop any playing audio
    if (!voiceEnabled && playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
  }, [voiceEnabled]);

  const cleanup = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear heartbeat timers
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsPlaying(false);
  }, []);

  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));

        // Set timeout for pong response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('Heartbeat timeout - reconnecting');
          wsRef.current?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();
    setIsConnecting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Build WebSocket URL
      const wsUrl = API_BASE_URL.replace('https://', 'wss://').replace(
        'http://',
        'ws://'
      );
      const ws = new WebSocket(
        `${wsUrl}/api/chat/${conversationId}/ws?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Chat WebSocket connected');
        setIsConnecting(false);
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        onConnectionChange?.(true);
        startHeartbeat();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              console.log('Chat session established:', data.conversation_id);
              break;

            case 'pong':
              // Clear heartbeat timeout
              if (heartbeatTimeoutRef.current) {
                clearTimeout(heartbeatTimeoutRef.current);
                heartbeatTimeoutRef.current = null;
              }
              break;

            case 'user_message':
              onUserMessage(parseMessage(data.message));
              break;

            case 'assistant_message':
              onAssistantMessage(parseMessage(data.message));

              // Initialize audio player if voice is enabled
              if (voiceEnabledRef.current && !playerRef.current) {
                playerRef.current = new PCMAudioPlayer({
                  onStateChange: (state) => {
                    setIsPlaying(state === 'playing');
                  },
                  onError: (error) => {
                    console.error('Audio player error:', error);
                  },
                });
                await playerRef.current.init();
              }
              break;

            case 'audio_chunk':
              if (voiceEnabledRef.current && playerRef.current) {
                playerRef.current.queueChunk(data.audio);
                if (!isPlaying) {
                  setIsPlaying(true);
                }
              }

              if (data.is_last) {
                // Audio streaming complete
                // Player will set isPlaying to false when audio finishes
              }
              break;

            case 'error':
              console.error('Chat WebSocket error:', data.message);
              onError(data.message);
              break;

            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('Chat WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        onConnectionChange?.(false);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003 && event.code !== 4004) {
          const delay =
            RECONNECT_DELAYS[
              Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
            ];
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      onError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [conversationId, getToken, cleanup, startHeartbeat, onUserMessage, onAssistantMessage, onError, onConnectionChange, isPlaying]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError('Not connected');
      return;
    }

    // Stop any playing audio before sending new message
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'message',
        content,
      })
    );
  }, [onError]);

  const stopAudio = useCallback(() => {
    // Stop local audio playback
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
    }

    // Tell server to stop TTS streaming
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_audio' }));
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  // Reconnect when conversationId changes
  useEffect(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [conversationId, connect]);

  return {
    isConnected,
    isConnecting,
    isPlaying,
    sendMessage,
    stopAudio,
    reconnect,
  };
}

function parseMessage(data: any): Message {
  return {
    id: data.id,
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    audioUrl: data.audioUrl,
    createdAt: new Date(data.createdAt),
  };
}
