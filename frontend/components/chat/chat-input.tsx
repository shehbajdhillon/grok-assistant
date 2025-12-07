'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Type, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSTT } from '@/hooks/use-stt';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendAudio?: (audioBlob: Blob) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onSendAudio,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  // Mode toggle - default to audio if supported
  const [inputMode, setInputMode] = useState<'text' | 'audio'>('audio');
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Recording state
  const { startRecording, stopRecording, isRecording, isSupported: sttSupported } = useSTT();
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Slide-to-cancel state
  const [dragOffset, setDragOffset] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const startXRef = useRef<number>(0);
  const CANCEL_THRESHOLD = -100; // pixels to left to trigger cancel

  // If STT not supported, default to text mode
  useEffect(() => {
    if (!sttSupported) {
      setInputMode('text');
    }
  }, [sttSupported]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Duration formatting
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startDurationTimer = () => {
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Text mode handlers
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Audio mode - Press and hold handlers
  const handlePointerDown = async (e: React.PointerEvent) => {
    if (disabled || !onSendAudio) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPressed(true);
    startXRef.current = e.clientX;
    setDragOffset(0);
    setIsCancelling(false);
    await startRecording();
    startDurationTimer();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressed || !isRecording) return;

    const deltaX = e.clientX - startXRef.current;
    // Only allow dragging left (negative values), clamp to -150
    const clampedOffset = Math.min(0, Math.max(deltaX, -150));
    setDragOffset(clampedOffset);
    setIsCancelling(clampedOffset <= CANCEL_THRESHOLD);
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isPressed) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsPressed(false);
    stopDurationTimer();

    if (isCancelling) {
      // Cancel: stop recording without sending
      await stopRecording();
    } else if (isRecording) {
      // Normal: send the audio
      const blob = await stopRecording();
      if (blob && onSendAudio) {
        onSendAudio(blob);
      }
    }
    setRecordingDuration(0);
    setDragOffset(0);
    setIsCancelling(false);
  };

  const handlePointerCancel = async (e: React.PointerEvent) => {
    if (!isPressed) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsPressed(false);
    stopDurationTimer();
    await stopRecording();
    setRecordingDuration(0);
    setDragOffset(0);
    setIsCancelling(false);
  };

  const canSend = message.trim().length > 0 && !disabled;
  const showAudioMode = inputMode === 'audio' && sttSupported && onSendAudio;

  return (
    <div className="border-t border-border/30 bg-gradient-to-t from-background via-background to-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          {showAudioMode ? (
            // ===== AUDIO MODE =====
            <motion.div
              key="audio-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative flex flex-col items-center py-4"
            >
              {/* Mode Toggle - Top Left */}
              <motion.button
                onClick={() => setInputMode('text')}
                className={cn(
                  'absolute left-0 top-0',
                  'flex h-11 w-11 items-center justify-center rounded-2xl',
                  'bg-white/5 backdrop-blur-sm',
                  'border border-white/10',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-white/10 hover:border-white/20',
                  'transition-all duration-300',
                  'shadow-lg shadow-black/5'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Switch to text input"
              >
                <Type className="h-4 w-4" />
              </motion.button>

              {/* Recording Status */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 flex items-center gap-3"
                  >
                    {/* Pulsing Recording Dot */}
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="h-3 w-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
                    />
                    {/* Timer */}
                    <span
                      className="font-mono text-lg font-medium tracking-wider text-foreground/80"
                      aria-live="polite"
                    >
                      {formatDuration(recordingDuration)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slide-to-Cancel Container */}
              <div className="relative flex w-full items-center justify-center">
                {/* Cancel Zone - appears to the left */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-1/2 mr-16 flex items-center gap-2"
                    >
                      {/* Animated chevrons pointing left */}
                      <motion.div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{
                              x: [-3, 0, -3],
                              opacity: [0.2, 0.6, 0.2],
                            }}
                            transition={{
                              duration: 1.2,
                              delay: i * 0.1,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Cancel indicator */}
                      <motion.div
                        className="flex items-center gap-2"
                        animate={{
                          scale: isCancelling ? 1.1 : 1,
                          x: isCancelling ? -5 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <motion.div
                          animate={{
                            scale: isCancelling ? 1.2 : 1,
                            rotate: isCancelling ? [0, -10, 10, 0] : 0,
                          }}
                          transition={{
                            scale: { type: 'spring', stiffness: 400, damping: 25 },
                            rotate: { duration: 0.3 },
                          }}
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            'transition-colors duration-200',
                            isCancelling
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-white/5 text-muted-foreground'
                          )}
                        >
                          <X className="h-5 w-5" />
                        </motion.div>
                        <span
                          className={cn(
                            'text-sm font-medium transition-colors duration-200',
                            isCancelling ? 'text-red-400' : 'text-muted-foreground'
                          )}
                        >
                          {isCancelling ? 'Release to cancel' : 'Slide to cancel'}
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

              {/* Large Microphone Button */}
              <motion.button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerCancel}
                disabled={disabled}
                className={cn(
                  'relative h-24 w-24 rounded-full',
                  'touch-none select-none',
                  'flex items-center justify-center',
                  'transition-[filter] duration-300',
                  'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                animate={{
                  scale: isPressed ? 1.15 : 1,
                  x: dragOffset,
                  opacity: isCancelling ? 0.5 : 1,
                }}
                style={{
                  filter: `grayscale(${Math.min(Math.abs(dragOffset) / 120, 1)})`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  x: { type: 'spring', stiffness: 500, damping: 30 },
                }}
                aria-label={
                  isCancelling
                    ? 'Release to cancel recording'
                    : isRecording
                      ? 'Recording - slide left to cancel, release to send'
                      : 'Hold to record voice message'
                }
              >
                {/* Outer Glow Ring */}
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    isRecording
                      ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20'
                      : 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20'
                  )}
                  animate={{
                    scale: isRecording ? [1, 1.3, 1] : 1,
                    opacity: isRecording ? [0.5, 0.2, 0.5] : 0.5,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isRecording ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                />

                {/* Main Button Background */}
                <div
                  className={cn(
                    'absolute inset-2 rounded-full',
                    'transition-all duration-500',
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 via-red-600 to-orange-600 shadow-2xl shadow-red-500/40'
                      : 'bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 shadow-2xl shadow-violet-500/40'
                  )}
                />

                {/* Glass Overlay */}
                <div
                  className={cn(
                    'absolute inset-2 rounded-full',
                    'bg-gradient-to-t from-transparent via-white/5 to-white/20',
                    'pointer-events-none'
                  )}
                />

                {/* Mic Icon */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: isRecording && !isCancelling ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: isRecording && !isCancelling ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                >
                  <Mic className="h-10 w-10 text-white drop-shadow-lg" />
                </motion.div>
              </motion.button>
              </div>

              {/* Help Text */}
              <motion.p
                className="mt-6 text-center text-sm text-muted-foreground/70"
                animate={{
                  opacity: isRecording ? 0.9 : 0.7,
                }}
              >
                {isCancelling ? (
                  <span className="text-red-400">Release to cancel</span>
                ) : isRecording ? (
                  <span className="text-foreground/80">
                    Release to send{' '}
                    <span className="text-muted-foreground/50">·</span>{' '}
                    <span className="text-muted-foreground/70">Slide left to cancel</span>
                  </span>
                ) : (
                  'Hold to record'
                )}
              </motion.p>
            </motion.div>
          ) : (
            // ===== TEXT MODE =====
            <motion.div
              key="text-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <div
                className={cn(
                  'relative flex items-end gap-2 rounded-2xl p-2',
                  'bg-white/5 backdrop-blur-sm',
                  'border border-white/10',
                  'transition-all duration-300',
                  'focus-within:border-violet-500/30 focus-within:bg-white/8',
                  'shadow-lg shadow-black/5'
                )}
              >
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    'min-h-[44px] max-h-[200px] flex-1 resize-none',
                    'border-0 bg-transparent px-3 py-2 text-sm',
                    'placeholder:text-muted-foreground/50',
                    'focus-visible:ring-0 focus-visible:ring-offset-0'
                  )}
                  rows={1}
                />

                <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
                  {/* Audio Mode Toggle */}
                  {sttSupported && onSendAudio && (
                    <Button
                      onClick={() => setInputMode('audio')}
                      disabled={disabled}
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-10 w-10 rounded-xl',
                        'text-muted-foreground hover:text-foreground',
                        'hover:bg-white/10',
                        'transition-all duration-200'
                      )}
                      aria-label="Switch to voice input"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={handleSend}
                    disabled={!canSend}
                    size="icon"
                    className={cn(
                      'h-10 w-10 rounded-xl transition-all duration-300',
                      canSend
                        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 hover:scale-105'
                        : 'bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Send className={cn('h-4 w-4', canSend && '-rotate-45')} />
                    <span className="sr-only">Send message</span>
                  </Button>
                </div>
              </div>

              <p className="mt-2 text-center text-xs text-muted-foreground/50">
                Press Enter to send, Shift+Enter for new line
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
