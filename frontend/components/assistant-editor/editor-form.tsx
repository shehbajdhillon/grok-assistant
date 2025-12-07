'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Assistant, TonePreset, VoiceId } from '@/types';
import { TONE_LABELS, TONE_COLORS, VOICE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = ['🤖', '🧙', '💪', '🌙', '⚡', '🏛️', '🎭', '🦊', '🐺', '🦁', '🐸', '🦉', '🌟', '💎', '🔥', '🌊'];

interface EditorFormProps {
  assistant?: Assistant;
  onSave: (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  onDelete?: () => void;
  onBack?: () => void;
  isEditing?: boolean;
}

export function EditorForm({
  assistant,
  onSave,
  onDelete,
  onBack,
  isEditing = false,
}: EditorFormProps) {
  const router = useRouter();

  const [name, setName] = useState(assistant?.name || '');
  const [description, setDescription] = useState(assistant?.description || '');
  const [personality, setPersonality] = useState(assistant?.personality || '');
  const [tone, setTone] = useState<TonePreset>(assistant?.tone || 'friendly');
  const [voiceId, setVoiceId] = useState<VoiceId>(assistant?.voiceSettings.voiceId || 'ara');
  const [speed, setSpeed] = useState(assistant?.voiceSettings.speed || 1.0);
  const [pitch, setPitch] = useState(assistant?.voiceSettings.pitch || 1.0);
  const [avatarEmoji, setAvatarEmoji] = useState(assistant?.avatarEmoji || '🤖');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(assistant?.avatarUrl || null);
  const [isPublic, setIsPublic] = useState(assistant?.isPublic ?? true);
  const [tags, setTags] = useState<string[]>(assistant?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setIsSaving(true);

    onSave({
      name: name.trim(),
      description: description.trim(),
      personality: personality.trim(),
      tone,
      voiceSettings: {
        voiceId,
        speed,
        pitch,
      },
      avatarUrl,
      avatarEmoji,
      createdBy: 'user-1',
      isPublic,
      tags,
    });

    setIsSaving(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const isValid = name.trim().length > 0 && description.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Go back</span>
          </Button>
          <h1 className="text-lg font-semibold">
            {isEditing ? 'Edit Assistant' : 'Create Assistant'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Regenerate
            </Button>
          )}
          {isEditing && onDelete && (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Delete assistant</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete assistant?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete{' '}
                    <strong>{assistant?.name}</strong> and all associated data.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={onDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSaving}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <div className="space-y-8">
          {/* Basic Info */}
          <Card className="border-border/50 p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Basic Information
            </h2>

            <div className="space-y-6">
              {/* Avatar Selection */}
              <div>
                <Label className="mb-3 block">Avatar</Label>

                {/* Generated Image Preview */}
                {avatarUrl && (
                  <div className="mb-4">
                    <div className="relative inline-block">
                      <img
                        src={avatarUrl}
                        alt="Generated avatar"
                        className="h-24 w-24 rounded-xl object-cover ring-2 ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      AI-generated avatar. Remove to use an emoji instead.
                    </p>
                  </div>
                )}

                {/* Emoji Selection (shown when no image or as fallback) */}
                <div className={cn(avatarUrl && 'opacity-50')}>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {avatarUrl ? 'Fallback emoji (used if image fails to load):' : 'Select an emoji avatar:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatarEmoji(emoji)}
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all',
                          avatarEmoji === emoji
                            ? 'bg-violet-500/20 ring-2 ring-violet-500'
                            : 'bg-muted/50 hover:bg-muted'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Atlas, Luna, Rex..."
                  className="mt-2"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of what this assistant does..."
                  className="mt-2 min-h-[80px]"
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {description.length}/200 characters
                </p>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                  {tags.length < 5 && (
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag..."
                      className="h-6 w-24 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Personality */}
          <Card className="border-border/50 p-6">
            <h2 className="mb-6 text-lg font-semibold">Personality</h2>

            <div className="space-y-6">
              {/* Tone */}
              <div>
                <Label>Tone</Label>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(TONE_LABELS) as TonePreset[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                        tone === t
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-border/50 hover:border-border hover:bg-muted/50'
                      )}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Prompt */}
              <div>
                <Label htmlFor="personality">Personality Prompt</Label>
                <Textarea
                  id="personality"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Describe the assistant's personality in detail. How should they talk? What's their background? What makes them unique?"
                  className="mt-2 min-h-[150px]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This prompt shapes how the assistant responds. Be specific!
                </p>
              </div>
            </div>
          </Card>

          {/* Voice Settings */}
          <Card className="border-border/50 p-6">
            <h2 className="mb-6 text-lg font-semibold">Voice Settings</h2>

            <div className="space-y-6">
              {/* Voice Selection */}
              <div>
                <Label>Voice</Label>
                <Select value={voiceId} onValueChange={(v) => setVoiceId(v as VoiceId)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VOICE_LABELS) as VoiceId[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {VOICE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speed */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Speed</Label>
                  <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={([v]) => setSpeed(v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="mt-3"
                />
              </div>

              {/* Pitch */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Pitch</Label>
                  <span className="text-sm text-muted-foreground">{pitch.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[pitch]}
                  onValueChange={([v]) => setPitch(v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="mt-3"
                />
              </div>
            </div>
          </Card>

          {/* Visibility */}
          <Card className="border-border/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Public Visibility</h2>
                <p className="text-sm text-muted-foreground">
                  Allow others to discover and use this assistant
                </p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </Card>
        </div>
      </form>
    </motion.div>
  );
}
