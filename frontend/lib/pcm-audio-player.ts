/**
 * PCM Audio Player for streaming TTS playback.
 *
 * Handles PCM linear16 audio data (24kHz, mono, 16-bit) from xAI TTS API.
 * Uses Web Audio API for seamless streaming playback with buffer scheduling.
 */

const SAMPLE_RATE = 24000;

export type PCMAudioPlayerState = 'idle' | 'playing' | 'stopped';

export interface PCMAudioPlayerCallbacks {
  onStateChange?: (state: PCMAudioPlayerState) => void;
  onError?: (error: Error) => void;
}

export class PCMAudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextPlayTime: number = 0;
  private state: PCMAudioPlayerState = 'idle';
  private callbacks: PCMAudioPlayerCallbacks;
  private pendingChunks: string[] = [];
  private isProcessing: boolean = false;

  constructor(callbacks: PCMAudioPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize the audio context. Must be called from a user gesture.
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    }

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Queue a PCM audio chunk for playback.
   * Chunks are base64-encoded PCM linear16 data.
   */
  queueChunk(pcmBase64: string): void {
    this.pendingChunks.push(pcmBase64);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingChunks.length === 0) return;
    if (!this.audioContext) {
      await this.init();
    }

    this.isProcessing = true;

    while (this.pendingChunks.length > 0) {
      const chunk = this.pendingChunks.shift()!;
      try {
        await this.playChunk(chunk);
      } catch (error) {
        console.error('Error playing chunk:', error);
        this.callbacks.onError?.(error as Error);
      }
    }

    this.isProcessing = false;
  }

  private async playChunk(pcmBase64: string): Promise<void> {
    if (!this.audioContext || this.state === 'stopped') return;

    // Decode base64 to PCM Int16Array
    const pcmData = this.base64ToPCM(pcmBase64);
    if (pcmData.length === 0) return;

    // Convert to AudioBuffer
    const audioBuffer = this.pcmToAudioBuffer(pcmData);

    // Schedule playback
    this.scheduleBuffer(audioBuffer);

    // Update state
    if (this.state !== 'playing') {
      this.state = 'playing';
      this.callbacks.onStateChange?.('playing');
    }
  }

  /**
   * Decode base64 string to Int16Array (PCM linear16).
   */
  private base64ToPCM(base64: string): Int16Array {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Int16Array(bytes.buffer);
    } catch (error) {
      console.error('Error decoding base64 audio:', error);
      return new Int16Array(0);
    }
  }

  /**
   * Convert PCM Int16Array to AudioBuffer.
   * PCM linear16 values are in range [-32768, 32767], normalize to [-1, 1].
   */
  private pcmToAudioBuffer(pcm: Int16Array): AudioBuffer {
    const floatData = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      floatData[i] = pcm[i] / 32768.0;
    }

    const buffer = this.audioContext!.createBuffer(
      1, // mono
      floatData.length,
      SAMPLE_RATE
    );
    buffer.getChannelData(0).set(floatData);

    return buffer;
  }

  /**
   * Schedule an AudioBuffer for seamless playback.
   * Uses precise timing to prevent gaps between chunks.
   */
  private scheduleBuffer(buffer: AudioBuffer): void {
    if (!this.audioContext || this.state === 'stopped') return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Schedule at the end of previously scheduled audio
    const startTime = Math.max(
      this.audioContext.currentTime + 0.01, // Small buffer to prevent underrun
      this.nextPlayTime
    );

    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;

    // Track source for cleanup
    this.scheduledSources.push(source);

    // Remove reference when done playing
    source.onended = () => {
      const index = this.scheduledSources.indexOf(source);
      if (index > -1) {
        this.scheduledSources.splice(index, 1);
      }

      // Check if all audio finished playing
      if (this.scheduledSources.length === 0 && this.pendingChunks.length === 0) {
        this.state = 'idle';
        this.callbacks.onStateChange?.('idle');
      }
    };
  }

  /**
   * Stop all playback and clear queued audio.
   */
  stop(): void {
    this.state = 'stopped';
    this.pendingChunks = [];

    // Stop all scheduled sources
    for (const source of this.scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore errors if already stopped
      }
    }
    this.scheduledSources = [];
    this.nextPlayTime = 0;

    this.callbacks.onStateChange?.('stopped');
  }

  /**
   * Reset player state for reuse.
   */
  reset(): void {
    this.stop();
    this.state = 'idle';
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Check if audio is currently playing.
   */
  get isPlaying(): boolean {
    return this.state === 'playing';
  }

  /**
   * Check if Web Audio API is supported.
   */
  static get isSupported(): boolean {
    return typeof window !== 'undefined' && 'AudioContext' in window;
  }
}
