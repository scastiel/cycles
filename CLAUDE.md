# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint via Next.js
```

No test framework is configured.

## Environment Variables

Required in `.env.local` (validated via Zod in `src/env.ts`):

- `NEXT_PUBLIC_LIVEBLOCKS_API_KEY` - Liveblocks public key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `LIVEBLOCKS_SECRET_KEY` - Liveblocks server secret
- `CLERK_SECRET_KEY` - Clerk server secret

## Architecture

**Cycles** is a real-time collaborative project planning app built with Next.js 14 (App Router), using Liveblocks for CRDT-based multiplayer state and Clerk for authentication.

### Data Layer — Liveblocks (no database)

All persistent data lives in Liveblocks rooms as `LiveList<LiveObject<T>>` collections. There is no traditional database. The core types are defined in `src/liveblocks.config.ts`:

- **Pitch** — a project/bet (has scopes)
- **Scope** — a work area within a pitch (has tasks, progress, effort/impact, color, core/optional/out flags)
- **Task** — a work item within a scope (status: todo/in_progress/done, type: task/optional/bug/question)
- **PitchSnapshot** — point-in-time snapshot of pitch progress

State is read with `useStorage()` and mutated with `useMutation()` (both from `src/liveblocks.config.ts` suspense exports). Presence tracks which pitch each user is viewing.

### Auth Flow

1. Clerk handles user auth and organization management (middleware in `src/middleware.ts`)
2. `POST /api/liveblocks-auth` creates a Liveblocks session scoped to the user's org rooms (`${orgId}:*`)
3. Room IDs follow the pattern `${orgId}:${roomSlug}` (or `${userId}:${roomSlug}` for personal boards)

### Routing

- `/` → redirects to `/boards`
- `/boards` — board list (server component, org-aware)
- `/boards/[roomId]` — board detail; server component loads room metadata, then renders `room.tsx` client component with `RoomProvider`
- `/api/liveblocks-auth` — Liveblocks auth endpoint

### Component Patterns

- Server components handle auth, data fetching, and org user lists; client components (`"use client"`) handle all interactive UI
- UI primitives from shadcn/ui (Radix-based) in `src/components/ui/`
- Drag-and-drop via dnd-kit (pitch reordering, task movement, scope dragging on hill chart)
- React Contexts for cross-component state: `SelectedPitchContext`, `SidePanelCollapsedContext`, `OrganizationUsersContext`, `HoveredScopeContext`
- Board-level server actions (`createRoom`, `updateBoard`, `archiveBoard`, `restoreBoard`) in `src/app/boards/board-context-menu.actions.ts`

### Key Libraries

- **Liveblocks** — real-time sync, CRDT storage, presence, undo/redo
- **Clerk** — auth, orgs, user metadata
- **dnd-kit** — drag and drop
- **SWR** — data fetching/caching
- **ts-pattern** — pattern matching
- **next-themes** — dark mode (class-based)

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).
