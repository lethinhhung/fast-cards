import { useSyncExternalStore } from "react";
import type { Flashcard } from "./types";

const KEY = "flashcards";

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Flashcard[] | null = null;

function readFromStorage(): Flashcard[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCard);
  } catch {
    return [];
  }
}

function getSnapshot(): Flashcard[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const SERVER_SNAPSHOT: Flashcard[] | null = null;
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function loadCards(): Flashcard[] {
  if (typeof window === "undefined") return [];
  return getSnapshot();
}

export function saveCards(cards: Flashcard[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(cards));
  cache = cards;
  for (const l of listeners) l();
}

export function useCards(): Flashcard[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addCard(input: { word: string; definition: string }): Flashcard {
  const cards = loadCards();
  const card: Flashcard = {
    id: cryptoRandomId(),
    word: input.word.trim(),
    definition: input.definition.trim(),
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
}

export function getCard(id: string): Flashcard | undefined {
  return loadCards().find((c) => c.id === id);
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

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normalizeImported(raw: unknown): Flashcard[] {
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
        correctCount: numOr(o.correctCount, 0),
        wrongCount: numOr(o.wrongCount, 0),
        createdAt: numOr(o.createdAt, now),
        lastReviewedAt:
          typeof o.lastReviewedAt === "number" ? o.lastReviewedAt : null,
      };
    })
    .filter((c): c is Flashcard => c !== null);
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
