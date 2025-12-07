'use client';

import { useState, useCallback, useRef } from 'react';

interface UseSTTReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
}

// WAV encoding parameters
const SAMPLE_RATE = 16000; // 16kHz is good for speech recognition
const NUM_CHANNELS = 1; // Mono

/**
 * Writes a string to a DataView at a given offset
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Converts Float32Array PCM samples to a WAV Blob
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true); // file size - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, NUM_CHANNELS, true); // number of channels
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * NUM_CHANNELS * 2, true); // byte rate
  view.setUint16(32, NUM_CHANNELS * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true); // data size

  // Write PCM samples (convert float32 [-1, 1] to int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Downsamples audio from one sample rate to another
 */
function downsample(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, buffer.length - 1);
    const t = srcIndex - srcIndexFloor;
    // Linear interpolation
    result[i] = buffer[srcIndexFloor] * (1 - t) + buffer[srcIndexCeil] * t;
  }

  return result;
}

export function useSTT(): UseSTTReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const pcmDataRef = useRef<Float32Array[]>([]);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof AudioContext !== 'undefined';

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording not supported in this browser');
      return;
    }

    try {
      setError(null);
      pcmDataRef.current = [];

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: NUM_CHANNELS,
          sampleRate: { ideal: SAMPLE_RATE },
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode for PCM capture (AudioWorklet would be better but more complex)
      // Note: ScriptProcessorNode is deprecated but still widely supported
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, NUM_CHANNELS, NUM_CHANNELS);

      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);
        // Copy the data since the buffer is reused
        pcmDataRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Store processor reference for cleanup (cast to any since we're using deprecated API)
      workletNodeRef.current = processor as unknown as AudioWorkletNode;

      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      console.error('Recording error:', err);
    }
  }, [isSupported]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording) {
      return null;
    }

    try {
      // Stop the processor
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        const inputSampleRate = audioContextRef.current.sampleRate;
        await audioContextRef.current.close();

        // Combine all PCM chunks into a single array
        const totalLength = pcmDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const combinedPCM = new Float32Array(totalLength);

        let offset = 0;
        for (const chunk of pcmDataRef.current) {
          combinedPCM.set(chunk, offset);
          offset += chunk.length;
        }

        // Downsample if necessary (browser may not honor our requested sample rate)
        const finalPCM = downsample(combinedPCM, inputSampleRate, SAMPLE_RATE);

        // Convert to WAV
        const wavBlob = encodeWAV(finalPCM, SAMPLE_RATE);

        audioContextRef.current = null;

        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        pcmDataRef.current = [];

        return wavBlob;
      }

      // Stop all tracks to release microphone
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);
      return null;
    } catch (err) {
      console.error('Error stopping recording:', err);
      setIsRecording(false);
      return null;
    }
  }, [isRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    isSupported,
    error,
  };
}
