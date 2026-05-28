import { useSyncExternalStore } from "react";
import type { Flashcard, Tag } from "./types";

const CARDS_KEY = "flashcards";
const TAGS_KEY = "tags";

type Listener = () => void;

const cardListeners = new Set<Listener>();
const tagListeners = new Set<Listener>();
let cardCache: Flashcard[] | null = null;
let tagCache: Tag[] | null = null;

function readCardsFromStorage(): Flashcard[] {
  try {
    const raw = window.localStorage.getItem(CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidCard)
      .map((c) => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [] }));
  } catch {
    return [];
  }
}

function readTagsFromStorage(): Tag[] {
  try {
    const raw = window.localStorage.getItem(TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTag);
  } catch {
    return [];
  }
}

function getCardSnapshot(): Flashcard[] {
  if (cardCache === null) cardCache = readCardsFromStorage();
  return cardCache;
}

function getTagSnapshot(): Tag[] {
  if (tagCache === null) tagCache = readTagsFromStorage();
  return tagCache;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CARDS_KEY) {
      cardCache = null;
      for (const l of cardListeners) l();
    } else if (e.key === TAGS_KEY) {
      tagCache = null;
      for (const l of tagListeners) l();
    }
  });
}

function subscribeCards(l: Listener) {
  cardListeners.add(l);
  return () => {
    cardListeners.delete(l);
  };
}

function subscribeTags(l: Listener) {
  tagListeners.add(l);
  return () => {
    tagListeners.delete(l);
  };
}

const SERVER_CARDS: Flashcard[] | null = null;
const SERVER_TAGS: Tag[] | null = null;
const getServerCards = () => SERVER_CARDS;
const getServerTags = () => SERVER_TAGS;

export function loadCards(): Flashcard[] {
  if (typeof window === "undefined") return [];
  return getCardSnapshot();
}

export function saveCards(cards: Flashcard[]): void {
  window.localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  cardCache = cards;
  for (const l of cardListeners) l();
}

export function useCards(): Flashcard[] | null {
  return useSyncExternalStore(subscribeCards, getCardSnapshot, getServerCards);
}

export function loadTags(): Tag[] {
  if (typeof window === "undefined") return [];
  return getTagSnapshot();
}

export function saveTags(tags: Tag[]): void {
  window.localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  tagCache = tags;
  for (const l of tagListeners) l();
}

export function useTags(): Tag[] | null {
  return useSyncExternalStore(subscribeTags, getTagSnapshot, getServerTags);
}

export function addCard(input: {
  word: string;
  definition: string;
  tags?: string[];
}): Flashcard {
  const cards = loadCards();
  const card: Flashcard = {
    id: cryptoRandomId(),
    word: input.word.trim(),
    definition: input.definition.trim(),
    tags: dedupeTagIds(input.tags ?? []),
    correctCount: 0,
    wrongCount: 0,
    createdAt: Date.now(),
    lastReviewedAt: null,
  };
  saveCards([card, ...cards]);
  return card;
}

export function updateCard(id: string, patch: Partial<Flashcard>): void {
  const cards = loadCards().map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveCards(cards);
}

export function deleteCard(id: string): void {
  saveCards(loadCards().filter((c) => c.id !== id));
}

export function clearAll(): void {
  saveCards([]);
  saveTags([]);
}

export function getCard(id: string): Flashcard | undefined {
  return loadCards().find((c) => c.id === id);
}

export function addTag(name: string): Tag | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const tags = loadTags();
  if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const tag: Tag = {
    id: cryptoRandomId(),
    name: trimmed,
    createdAt: Date.now(),
  };
  saveTags([...tags, tag]);
  return tag;
}

export function renameTag(id: string, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const tags = loadTags();
  const exists = tags.some(
    (t) => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return false;
  saveTags(tags.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
  return true;
}

export function deleteTag(id: string): void {
  saveTags(loadTags().filter((t) => t.id !== id));
  const cards = loadCards();
  let changed = false;
  const next = cards.map((c) => {
    if (!c.tags.includes(id)) return c;
    changed = true;
    return { ...c, tags: c.tags.filter((t) => t !== id) };
  });
  if (changed) saveCards(next);
}

export function countCardsWithTag(id: string): number {
  return loadCards().filter((c) => c.tags.includes(id)).length;
}

function dedupeTagIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id)));
}

function isValidCard(v: unknown): v is Flashcard {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.word === "string" &&
    typeof c.definition === "string"
  );
}

function isValidTag(v: unknown): v is Tag {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    t.name.length > 0
  );
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normalizeImported(
  raw: unknown,
  resolveTag?: (name: string) => string,
): Flashcard[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw
    .map((r): Flashcard | null => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const word = typeof o.word === "string" ? o.word.trim() : "";
      const definition =
        typeof o.definition === "string" ? o.definition.trim() : "";
      if (!word || !definition) return null;
      return {
        id: typeof o.id === "string" ? o.id : cryptoRandomId(),
        word,
        definition,
        tags: resolveImportedTags(o.tags, resolveTag),
        correctCount: numOr(o.correctCount, 0),
        wrongCount: numOr(o.wrongCount, 0),
        createdAt: numOr(o.createdAt, now),
        lastReviewedAt:
          typeof o.lastReviewedAt === "number" ? o.lastReviewedAt : null,
      };
    })
    .filter((c): c is Flashcard => c !== null);
}

function resolveImportedTags(
  raw: unknown,
  resolveTag?: (name: string) => string,
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const id = resolveTag ? resolveTag(trimmed) : trimmed;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function ensureTagsByName(names: string[]): string[] {
  const existing = loadTags();
  const byNameLower = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const toAdd: Tag[] = [];
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let tag = byNameLower.get(key);
    if (!tag) {
      tag = { id: cryptoRandomId(), name, createdAt: Date.now() };
      byNameLower.set(key, tag);
      toAdd.push(tag);
    }
    if (!ids.includes(tag.id)) ids.push(tag.id);
  }
  if (toAdd.length > 0) saveTags([...existing, ...toAdd]);
  return ids;
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
