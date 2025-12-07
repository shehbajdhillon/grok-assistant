export const APP_NAME = 'AI Companion';

export const TONE_LABELS: Record<string, string> = {
  // Positive tones
  professional: 'Professional',
  friendly: 'Friendly',
  humorous: 'Humorous',
  empathetic: 'Empathetic',
  motivational: 'Motivational',
  cheerful: 'Cheerful',
  playful: 'Playful',
  enthusiastic: 'Enthusiastic',
  warm: 'Warm',
  supportive: 'Supportive',
  // Neutral tones
  casual: 'Casual',
  formal: 'Formal',
  mysterious: 'Mysterious',
  calm: 'Calm',
  analytical: 'Analytical',
  stoic: 'Stoic',
  philosophical: 'Philosophical',
  // Negative tones
  sarcastic: 'Sarcastic',
  blunt: 'Blunt',
  cynical: 'Cynical',
  melancholic: 'Melancholic',
  stern: 'Stern',
  dramatic: 'Dramatic',
  pessimistic: 'Pessimistic',
};

export const VOICE_LABELS: Record<string, string> = {
  ara: 'Ara (Female)',
  rex: 'Rex (Male)',
  eve: 'Eve (Female)',
  leo: 'Leo (Male)',
  una: 'Una (Female)',
  sal: 'Sal',
};

export const TONE_COLORS: Record<string, string> = {
  // Positive tones (warmer colors)
  professional: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  friendly: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  humorous: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  empathetic: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  motivational: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  cheerful: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  playful: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  enthusiastic: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  warm: 'bg-orange-400/10 text-orange-500 dark:text-orange-300',
  supportive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  // Neutral tones (balanced colors)
  casual: 'bg-green-500/10 text-green-600 dark:text-green-400',
  formal: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  mysterious: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  calm: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  analytical: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  stoic: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
  philosophical: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  // Negative tones (cooler/darker colors)
  sarcastic: 'bg-lime-500/10 text-lime-600 dark:text-lime-400',
  blunt: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  cynical: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  melancholic: 'bg-blue-600/10 text-blue-700 dark:text-blue-300',
  stern: 'bg-red-500/10 text-red-600 dark:text-red-400',
  dramatic: 'bg-purple-600/10 text-purple-700 dark:text-purple-300',
  pessimistic: 'bg-slate-600/10 text-slate-700 dark:text-slate-300',
};
