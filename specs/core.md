# Flashcard App Spec

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui (Radix primitives), localStorage, Vercel.

## Pages

- `/` — Study screen
- `/cards` — List all cards (search, edit, delete)
- `/add` — Add new card
- `/cards/[id]` — Edit existing card

## Features

### CRUD

- **Create**: add card with word + definition
- **Read**: list all cards with search/filter by word
- **Update**: edit word or definition
- **Delete**: remove a card (with confirm)
- **Bulk delete**: clear all cards (with confirm)

### Study

- Show definition, user types word
- **Correct**: `correctCount++`, next card
- **Wrong**: reveal answer, `wrongCount++`, requeue to appear later
- Shuffle deck at session start
- Show progress (e.g. `3 / 20`)
- Empty state when no cards exist

### Import / Export

- JSON + CSV
- Import: merge or replace (user choice)
- Export: download all cards

### Stats (per card, on list view)

- Times correct / wrong
- Last reviewed

## Data Model

```ts
type Flashcard = {
  id: string;
  word: string;
  definition: string;
  correctCount: number;
  wrongCount: number;
  createdAt: number;
  lastReviewedAt: number | null;
};
```

Stored in localStorage under `flashcards`.

## Non-Goals

Auth, backend, database, AI, categories, spaced repetition, multi-deck.

## Done

- Full CRUD works
- Study loop with requeue
- Import/export (JSON + CSV)
- Search on list
- Persists on refresh
- Mobile + desktop
