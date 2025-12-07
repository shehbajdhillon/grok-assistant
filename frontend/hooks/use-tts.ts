'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { VoiceSettings } from '@/types';
import { PCMAudioPlayer } from '@/lib/pcm-audio-player';
import * as api from '@/lib/api-client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://grok-assistant-production.up.railway.app';

interface UseTTSReturn {
  speak: (text: string, settings?: Partial<VoiceSettings>) => void;
  stop: () => void;
  isPlaying: boolean;
  isConnecting: boolean;
  isSupported: boolean;
}

const defaultSettings: VoiceSettings = {
  voiceType: 'preset',
  voiceId: 'ara',
  customVoiceUrl: null,
  customVoiceFileName: null,
  speed: 1.0,
  pitch: 1.0,
};

export function useTTS(): UseTTSReturn {
  const { getToken } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PCMAudioPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsSupported(PCMAudioPlayer.isSupported);

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop and dispose audio player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Stop HTML5 Audio (for custom voice)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    setIsPlaying(false);
    setIsConnecting(false);
  }, []);

  const speakWithCustomVoice = useCallback(
    async (text: string, customVoiceUrl: string) => {
      try {
        setIsConnecting(true);

        // Generate audio via REST API
        const audioBlob = await api.generateCustomTTS(text, customVoiceUrl);
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play HTML5 Audio element
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsConnecting(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = () => {
          console.error('Audio playback error');
          setIsPlaying(false);
          setIsConnecting(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        console.error('Custom voice TTS error:', error);
        cleanup();
      }
    },
    [cleanup]
  );

  const speakWithPresetVoice = useCallback(
    async (text: string, voiceId: string, token: string) => {
      // Initialize audio player with state callbacks
      playerRef.current = new PCMAudioPlayer({
        onStateChange: (state) => {
          if (state === 'playing') {
            setIsPlaying(true);
          } else if (state === 'idle' || state === 'stopped') {
            setIsPlaying(false);
          }
        },
        onError: (error) => {
          console.error('Audio player error:', error);
        },
      });

      // Initialize audio context (must happen from user gesture context)
      await playerRef.current.init();

      // Build WebSocket URL with token
      const wsUrl = API_BASE_URL.replace('https://', 'wss://').replace(
        'http://',
        'ws://'
      );
      const ws = new WebSocket(
        `${wsUrl}/api/tts/ws/stream?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsPlaying(true);

        // Send TTS request
        ws.send(
          JSON.stringify({
            text,
            voice_id: voiceId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio_chunk') {
            // Queue audio chunk for playback
            playerRef.current?.queueChunk(data.audio);

            if (data.is_last) {
              // All chunks received, connection can close
              // Audio player will handle playback completion
              ws.close();
            }
          } else if (data.type === 'error') {
            console.error('TTS server error:', data.message);
            cleanup();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        cleanup();
      };

      ws.onclose = () => {
        setIsConnecting(false);
        wsRef.current = null;
      };
    },
    [cleanup]
  );

  const speak = useCallback(
    async (text: string, settings: Partial<VoiceSettings> = {}) => {
      if (!isSupported) {
        console.warn('Web Audio API not supported');
        return;
      }

      // Clean up any existing connection/playback
      cleanup();

      const mergedSettings = { ...defaultSettings, ...settings };

      try {
        setIsConnecting(true);

        // Check if using custom voice
        if (mergedSettings.voiceType === 'custom' && mergedSettings.customVoiceUrl) {
          await speakWithCustomVoice(text, mergedSettings.customVoiceUrl);
        } else {
          // Get auth token from Clerk for WebSocket
          const token = await getToken();
          if (!token) {
            throw new Error('Not authenticated');
          }
          await speakWithPresetVoice(text, mergedSettings.voiceId, token);
        }
      } catch (error) {
        console.error('TTS error:', error);
        cleanup();
      }
    },
    [isSupported, getToken, cleanup, speakWithCustomVoice, speakWithPresetVoice]
  );

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return { speak, stop, isPlaying, isConnecting, isSupported };
}
