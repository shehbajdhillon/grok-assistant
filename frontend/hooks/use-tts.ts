'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceSettings } from '@/types';

interface UseTTSReturn {
  speak: (text: string, settings?: Partial<VoiceSettings>) => void;
  stop: () => void;
  isPlaying: boolean;
  isSupported: boolean;
}

const defaultSettings: VoiceSettings = {
  voiceId: 'alloy',
  speed: 1.0,
  pitch: 1.0,
};

export function useTTS(): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const speak = useCallback(
    (text: string, settings: Partial<VoiceSettings> = {}) => {
      if (!isSupported) return;

      // Stop any current speech
      window.speechSynthesis.cancel();

      const mergedSettings = { ...defaultSettings, ...settings };
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.rate = mergedSettings.speed;
      utterance.pitch = mergedSettings.pitch;

      // Try to find a voice that matches the voiceId style
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Map our voice IDs to preferred voice characteristics
        const voiceMap: Record<string, string[]> = {
          alloy: ['Google US English', 'Microsoft David', 'Alex'],
          echo: ['Google UK English Male', 'Microsoft Mark', 'Daniel'],
          fable: ['Google UK English Female', 'Microsoft Hazel', 'Karen'],
          onyx: ['Microsoft David', 'Google US English', 'Alex'],
          nova: ['Google US English Female', 'Microsoft Zira', 'Samantha'],
          shimmer: ['Microsoft Zira', 'Google US English Female', 'Victoria'],
        };

        const preferredNames = voiceMap[mergedSettings.voiceId] || [];
        const matchedVoice = voices.find((v) =>
          preferredNames.some((name) => v.name.includes(name))
        );

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, stop, isPlaying, isSupported };
}
