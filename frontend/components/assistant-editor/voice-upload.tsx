'use client';

import { useState, useRef } from 'react';
import { Upload, X, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceUploadProps {
  currentFileName: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = '.mp3,.m4a,.wav';
const MAX_SIZE_MB = 10;

export function VoiceUpload({
  currentFileName,
  onFileSelect,
  onRemove,
  isUploading,
  disabled = false,
}: VoiceUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    setError(null);

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['mp3', 'm4a', 'wav'].includes(ext || '')) {
      setError('Please upload an MP3, M4A, or WAV file');
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files?.[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {currentFileName ? (
        <div className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              ) : (
                <Volume2 className="h-5 w-5 text-violet-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{currentFileName}</p>
              <p className="text-xs text-muted-foreground">
                {isUploading ? 'Uploading...' : 'Custom voice sample'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={isUploading || disabled}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 transition-colors',
            dragActive
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-border/50 hover:border-border',
            (isUploading || disabled) && 'pointer-events-none opacity-50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isUploading) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <Button
                type="button"
                variant="link"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || isUploading}
                className="h-auto p-0 text-violet-500"
              >
                Upload a voice sample
              </Button>
              <span className="text-muted-foreground"> or drag and drop</span>
            </div>
            <p className="text-xs text-muted-foreground">
              MP3, M4A, or WAV up to {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        Upload a short audio clip (5-30 seconds) of the voice you want to clone.
        Clear speech without background noise works best.
      </p>
    </div>
  );
}
