'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { EditorForm } from './editor-form';
import { useGenerateAssistant } from '@/hooks/use-generate-assistant';
import { Assistant } from '@/types';

interface GenerationWizardProps {
  onSave: (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
}

export function GenerationWizard({ onSave }: GenerationWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [prompt, setPrompt] = useState('');
  const { generate, isGenerating, error, generatedData, reset } = useGenerateAssistant();

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) return;
    try {
      await generate(prompt);
      setStep(2);
    } catch {
      // Error is handled by hook
    }
  };

  const handleBack = () => {
    setStep(1);
    reset();
  };

  const handleSkip = () => {
    setStep(2);
  };

  return (
    <AnimatePresence mode="wait">
      {step === 1 ? (
        <motion.div
          key="step1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="min-h-screen bg-background"
        >
          {/* Step 1: Prompt Input */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
            <h1 className="text-lg font-semibold">Create Assistant</h1>
          </header>

          <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
            <Card className="border-border/50 p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Describe Your Assistant</h2>
                <p className="mt-2 text-muted-foreground">
                  Tell us what kind of AI companion you want to create
                </p>
              </div>

              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., I want a motivational gym coach who speaks like a drill sergeant but is secretly supportive, or a mysterious storyteller who tells dark fairy tales..."
                className="min-h-[150px] text-lg"
                disabled={isGenerating}
              />

              <p className="mt-2 text-sm text-muted-foreground">
                {prompt.length}/1000 characters (minimum 10)
              </p>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleGenerate}
                disabled={prompt.length < 10 || isGenerating}
                className="mt-6 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Assistant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Or{' '}
                <button
                  onClick={handleSkip}
                  className="text-violet-500 hover:underline"
                  disabled={isGenerating}
                >
                  skip and create manually
                </button>
              </p>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          {/* Step 2: Pre-filled Form */}
          <EditorForm
            assistant={
              generatedData
                ? {
                    id: '',
                    ...generatedData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: '',
                    usageCount: 0,
                  }
                : undefined
            }
            onSave={onSave}
            onBack={generatedData ? handleBack : undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
