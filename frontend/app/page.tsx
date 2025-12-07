'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, MessageCircle, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const sampleAssistants = [
    { emoji: '🌟', name: 'Atlas', role: 'Motivational Coach' },
    { emoji: '🌙', name: 'Luna', role: 'Thoughtful Listener' },
    { emoji: '💪', name: 'Rex', role: 'Fitness Trainer' },
    { emoji: '📚', name: 'Sage', role: 'Study Companion' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Animated background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,0,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridScroll 20s linear infinite',
          }}
        />
      </div>

      {/* Neon glow effects */}
      <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[800px] w-[800px] translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-20">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <span
              className="text-2xl font-black tracking-tighter text-white"
              style={{ fontFamily: '"Archivo Black", sans-serif' }}
            >
              AI COMPANION
            </span>
          </div>
          <Link href="/home">
            <Button
              variant="outline"
              className="border-cyan-500/50 bg-black/40 text-cyan-400 backdrop-blur-sm hover:bg-cyan-500/20 hover:text-cyan-300"
            >
              Sign In
            </Button>
          </Link>
        </motion.header>

        {/* Hero Section - Diagonal Split Layout */}
        <div className="mb-32 grid gap-12 md:grid-cols-2 md:gap-20">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-fuchsia-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-fuchsia-300">
                Next-Gen AI Platform
              </span>
            </div>

            <h1
              className="mb-6 text-6xl font-black leading-[0.9] tracking-tighter text-white md:text-7xl lg:text-8xl"
              style={{ fontFamily: '"Archivo Black", sans-serif' }}
            >
              YOUR
              <br />
              <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                PERSONAL
              </span>
              <br />
              AI CREW
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed text-gray-300 md:text-xl">
              Build custom AI assistants with distinct personalities. From motivational coaches to study companions —
              create the perfect AI crew for your life.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/home">
                <Button
                  size="lg"
                  className="group relative overflow-hidden bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-6 text-lg font-black text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(236,72,153,0.5)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    GET STARTED
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 bg-black/40 px-8 py-6 text-lg font-bold text-cyan-400 backdrop-blur-sm hover:bg-cyan-500/20 hover:text-cyan-300"
              >
                EXPLORE DEMO
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <div className="mb-1 text-3xl font-black text-fuchsia-400">500+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Assistants</div>
              </div>
              <div>
                <div className="mb-1 text-3xl font-black text-cyan-400">24/7</div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Available</div>
              </div>
              <div>
                <div className="mb-1 text-3xl font-black text-purple-400">∞</div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Possibilities</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Feature Cards with Diagonal Layout */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="space-y-6">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="group relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/50 to-purple-950/30 p-8 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-fuchsia-500/60 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]"
              >
                <MessageCircle className="mb-4 h-10 w-10 text-fuchsia-400" />
                <h3 className="mb-2 text-2xl font-black text-white">Endless Conversations</h3>
                <p className="text-gray-400">Chat with AI companions that understand context and adapt to your needs.</p>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="group relative ml-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 to-blue-950/30 p-8 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-cyan-500/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
              >
                <Mic2 className="mb-4 h-10 w-10 text-cyan-400" />
                <h3 className="mb-2 text-2xl font-black text-white">Voice Enabled</h3>
                <p className="text-gray-400">Hear your AI speak with customizable voice settings and natural speech.</p>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-cyan-500/20 blur-2xl" />
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-indigo-950/30 p-8 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
              >
                <Sparkles className="mb-4 h-10 w-10 text-purple-400" />
                <h3 className="mb-2 text-2xl font-black text-white">Custom Personalities</h3>
                <p className="text-gray-400">Design unique AI companions with distinct tones, styles, and expertise.</p>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/20 blur-2xl" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Sample Assistants Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mb-32"
        >
          <div className="mb-12 text-center">
            <h2
              className="mb-4 text-5xl font-black tracking-tighter text-white md:text-6xl"
              style={{ fontFamily: '"Archivo Black", sans-serif' }}
            >
              MEET THE{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                CREW
              </span>
            </h2>
            <p className="text-lg text-gray-400">
              Popular AI assistants created by our community
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sampleAssistants.map((assistant, index) => (
              <motion.div
                key={assistant.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 backdrop-blur-sm transition-all hover:scale-105 hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                <div className="mb-4 text-6xl">{assistant.emoji}</div>
                <h3 className="mb-2 text-2xl font-black text-white">{assistant.name}</h3>
                <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  {assistant.role}
                </p>
                <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 blur-2xl" />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="relative overflow-hidden rounded-3xl border border-gradient-to-r from-fuchsia-500/50 to-cyan-500/50 bg-gradient-to-r from-fuchsia-950/50 via-purple-950/50 to-cyan-950/50 p-12 text-center backdrop-blur-sm md:p-20"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

          <div className="relative z-10">
            <h2
              className="mb-6 text-5xl font-black tracking-tighter text-white md:text-6xl"
              style={{ fontFamily: '"Archivo Black", sans-serif' }}
            >
              READY TO BUILD
              <br />
              YOUR AI COMPANION?
            </h2>
            <p className="mb-10 text-xl text-gray-300">
              Join thousands creating personalized AI assistants
            </p>
            <Link href="/home">
              <Button
                size="lg"
                className="group relative overflow-hidden bg-white px-12 py-7 text-xl font-black text-black transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  START FOR FREE
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                </span>
              </Button>
            </Link>
          </div>

          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/30 blur-[100px]" />
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.0 }}
          className="mt-20 border-t border-white/10 pt-12 text-center"
        >
          <p className="text-sm font-bold uppercase tracking-wider text-gray-600">
            © 2025 AI Companion. Built for the future.
          </p>
        </motion.footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');

        @keyframes gridScroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(60px);
          }
        }
      `}</style>
    </div>
  );
}
