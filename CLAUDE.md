# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Vision

**AI Companion** is a Jarvis-style AI assistant platform where users can create, customize, and chat with personalized AI companions.

### Core Concept
- Users create custom AI assistants with distinct personalities (e.g., a kind therapist, a tough gym bro, a mysterious storyteller)
- Each assistant has configurable: personality prompt, tone, voice, and avatar
- Users can make assistants public for others to discover and use
- Chat interface supports both text and voice output (TTS)

### Key User Flows
1. **Discovery** - Browse public assistants created by the community, sorted by popularity
2. **Chat** - Start conversations with any assistant; single-thread long-context chats
3. **Create** - Build custom assistants with personality, tone presets, voice settings, emoji avatar
4. **Share** - Toggle assistants public/private for community discovery

### Current State
- Frontend complete with mock data (no backend yet)
- 6 sample assistants pre-populated (Atlas, Luna, Rex, Sage, Noir, Ziggy)
- TTS uses browser SpeechSynthesis API (placeholder for real TTS API)
- AI responses are mocked based on tone (placeholder for real AI API)

### Future Backend Needs
- Real AI API integration (OpenAI, Anthropic, etc.) for dynamic responses
- TTS API (ElevenLabs, OpenAI TTS) for quality voice output
- Database for persistent conversations and assistants
- User authentication

## Commands

All commands run from the `frontend/` directory:

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** with shadcn/ui components
- **Framer Motion** for animations
- **next-themes** for dark/light mode

### Directory Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Discovery page (main)
│   ├── chat/[conversationId]/  # Chat interface
│   ├── assistant/new/     # Create assistant
│   ├── assistant/[id]/edit/    # Edit assistant
│   └── settings/          # User settings
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── layout/            # AppShell, Sidebar, FAB
│   ├── discovery/         # Assistant cards and grid
│   ├── chat/              # Messages, input, header
│   └── assistant-editor/  # Create/edit form
├── hooks/                 # Custom React hooks
├── lib/
│   ├── mock-data.ts       # In-memory data store
│   └── constants.ts       # Tone/voice options
└── types/                 # TypeScript interfaces
```

### Key Patterns

**State Management**: Custom hooks wrap the mock data store (`use-assistants.ts`, `use-conversations.ts`). No external state library.

**Data Layer**: All data is currently in-memory via `lib/mock-data.ts`. Replace with real API calls for production.

**Responsive Design**: Mobile-first with `md:` breakpoint for desktop. Desktop shows sidebar, mobile uses drawer.

**Client Components**: Pages with interactivity use `'use client'` directive. Layout remains a server component.

### Type Definitions

Core types in `types/index.ts`:
- `Assistant` - AI personality with name, description, tone, voice settings
- `Conversation` - Chat thread with messages
- `Message` - Single message with role (user/assistant)
- `VoiceSettings` - voiceId, speed, pitch for TTS

### Adding shadcn Components

```bash
cd frontend
npx shadcn@latest add [component-name]
```
