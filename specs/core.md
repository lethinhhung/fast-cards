# Flashcard App Spec

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui (Radix primitives), localStorage, Vercel.

## Pages

- `/` — Study screen (tag filter + session)
- `/cards` — List all cards (search, filter by tag, edit, delete)
- `/add` — Add new card
- `/cards/[id]` — Edit existing card
- `/tags` — Manage tags (create, rename, delete)

## Features

### CRUD (cards)

- **Create**: add card with word + definition + 0..N tags. Records `createdAt`.
- **Read**: list all cards with search/filter by word + tag filter. Shows date added.
- **Update**: edit word, definition, or tags
- **Delete**: remove a card (with confirm)
- **Bulk delete**: clear all cards (with confirm)

### Tags

- A card has 0 or more tags
- **Create / Rename / Delete** tags from `/tags`
- Deleting a tag removes it from every card (with confirm showing affected count)
- Tag names are unique (case-insensitive) and non-empty
- Tags are shown as chips on the card list

### Study

- Before a session, user selects 0..N tags. No tags = all cards.
- Show definition, user types word
- **Correct**: `correctCount++`, next card
- **Wrong**: reveal answer, `wrongCount++`, requeue to appear later
- Shuffle deck at session start
- Show progress (e.g. `3 / 20`)
- Empty state when no cards match the filter

### Import / Export

- JSON + CSV
- Import: merge or replace (user choice)
- Export: download all cards
- Tags are exported by name; on import any unknown tag names are created

### Stats (per card, on list view)

- Times correct / wrong
- Date added
- Last reviewed
- Tags

## Data Model

```ts
type Flashcard = {
  id: string;
  word: string;
  definition: string;
  tags: string[]; // tag ids
  correctCount: number;
  wrongCount: number;
  createdAt: number;
  lastReviewedAt: number | null;
};

type Tag = {
  id: string;
  name: string;
  createdAt: number;
};
```

Stored in localStorage under `flashcards` and `tags`.

## Non-Goals

Auth, backend, database, AI, spaced repetition, multi-deck.

## Done

- Full CRUD works (cards + tags)
- Study loop with requeue and tag filter
- Import/export (JSON + CSV) with tags
- Search + tag filter on list
- Persists on refresh
- Mobile + desktop
