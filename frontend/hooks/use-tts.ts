'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceSettings } from '@/types';
import { synthesizeSpeech } from '@/lib/api-client';

interface UseTTSReturn {
  speak: (text: string, settings?: Partial<VoiceSettings>) => void;
  stop: () => void;
  isPlaying: boolean;
  isSupported: boolean;
}

const defaultSettings: VoiceSettings = {
  voiceId: 'ara',
  speed: 1.0,
  pitch: 1.0,
};

export function useTTS(): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Audio playback is supported in all modern browsers
    setIsSupported(typeof window !== 'undefined' && typeof Audio !== 'undefined');
  }, []);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(
    async (text: string, settings: Partial<VoiceSettings> = {}) => {
      if (!isSupported) return;

      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const mergedSettings = { ...defaultSettings, ...settings };

      try {
        setIsPlaying(true);

        // Call backend TTS API
        const audioBuffer = await synthesizeSpeech(
          text,
          mergedSettings.voiceId,
          'mp3'
        );

        // Create blob and audio element
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        // Apply playback speed
        audio.playbackRate = mergedSettings.speed;

        audio.onended = () => {
          setIsPlaying(false);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };

        audio.onerror = () => {
          console.error('Audio playback error');
          setIsPlaying(false);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };

        await audio.play();
      } catch (error) {
        console.error('TTS error:', error);
        setIsPlaying(false);
      }
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { speak, stop, isPlaying, isSupported };
}
