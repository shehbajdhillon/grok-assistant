'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Volume2, Moon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { getCurrentUser, updateUserPreferences } from '@/lib/mock-data';
import { APP_NAME } from '@/lib/constants';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    setVoiceEnabled(user.preferences.defaultVoiceEnabled);
    setAutoPlayVoice(user.preferences.autoPlayVoice);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (mounted) {
      updateUserPreferences({
        defaultVoiceEnabled: voiceEnabled,
        autoPlayVoice: autoPlayVoice,
      });
    }
  }, [voiceEnabled, autoPlayVoice, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Go back</span>
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <div className="space-y-6">
          {/* Appearance */}
          <Card className="border-border/50 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Moon className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h2 className="font-semibold">Appearance</h2>
                <p className="text-sm text-muted-foreground">
                  Customize how {APP_NAME} looks
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Voice Settings */}
          <Card className="border-border/50 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10">
                <Volume2 className="h-5 w-5 text-fuchsia-500" />
              </div>
              <div>
                <h2 className="font-semibold">Voice</h2>
                <p className="text-sm text-muted-foreground">
                  Control text-to-speech behavior
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Voice</Label>
                  <p className="text-sm text-muted-foreground">
                    Show voice playback controls on messages
                  </p>
                </div>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-play Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically read assistant responses aloud
                  </p>
                </div>
                <Switch
                  checked={autoPlayVoice}
                  onCheckedChange={setAutoPlayVoice}
                  disabled={!voiceEnabled}
                />
              </div>
            </div>
          </Card>

          {/* Account */}
          <Card className="border-border/50 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-semibold">Account</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account settings
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Account management coming soon
              </p>
            </div>
          </Card>

          {/* About */}
          <Card className="border-border/50 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
                <Settings className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h2 className="font-semibold">About</h2>
                <p className="text-sm text-muted-foreground">
                  Application information
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span>Development</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
