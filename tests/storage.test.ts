import { describe, expect, test } from "vitest";
import {
  addCard,
  clearAll,
  deleteCard,
  getCard,
  loadCards,
  normalizeImported,
  saveCards,
  updateCard,
} from "@/lib/storage";

describe("addCard", () => {
  test("creates card with trimmed fields, zero counts, timestamps", () => {
    const before = Date.now();
    const c = addCard({ word: "  hello  ", definition: "  greeting " });
    expect(c.word).toBe("hello");
    expect(c.definition).toBe("greeting");
    expect(c.correctCount).toBe(0);
    expect(c.wrongCount).toBe(0);
    expect(c.lastReviewedAt).toBeNull();
    expect(c.createdAt).toBeGreaterThanOrEqual(before);
    expect(c.id).toMatch(/.+/);
  });

  test("prepends to existing list", () => {
    const a = addCard({ word: "a", definition: "1" });
    const b = addCard({ word: "b", definition: "2" });
    const cards = loadCards();
    expect(cards.map((c) => c.id)).toEqual([b.id, a.id]);
  });

  test("persists across loadCards calls (and survives reload)", () => {
    addCard({ word: "persisted", definition: "x" });
    const raw = window.localStorage.getItem("flashcards");
    expect(raw).toContain("persisted");
  });
});

describe("updateCard", () => {
  test("patches only matched id", () => {
    const a = addCard({ word: "a", definition: "1" });
    const b = addCard({ word: "b", definition: "2" });
    updateCard(a.id, { correctCount: 5, lastReviewedAt: 999 });
    const cards = loadCards();
    const ua = cards.find((c) => c.id === a.id)!;
    const ub = cards.find((c) => c.id === b.id)!;
    expect(ua.correctCount).toBe(5);
    expect(ua.lastReviewedAt).toBe(999);
    expect(ub.correctCount).toBe(0);
  });

  test("no-op for unknown id", () => {
    addCard({ word: "a", definition: "1" });
    updateCard("nonexistent", { correctCount: 99 });
    expect(loadCards()[0].correctCount).toBe(0);
  });
});

describe("deleteCard", () => {
  test("removes matched card, keeps others", () => {
    const a = addCard({ word: "a", definition: "1" });
    const b = addCard({ word: "b", definition: "2" });
    deleteCard(a.id);
    const cards = loadCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(b.id);
  });
});

describe("clearAll", () => {
  test("empties the list", () => {
    addCard({ word: "a", definition: "1" });
    addCard({ word: "b", definition: "2" });
    clearAll();
    expect(loadCards()).toEqual([]);
  });
});

describe("getCard", () => {
  test("returns matching card or undefined", () => {
    const a = addCard({ word: "a", definition: "1" });
    expect(getCard(a.id)?.word).toBe("a");
    expect(getCard("missing")).toBeUndefined();
  });
});

describe("loadCards", () => {
  test("returns [] when key absent", () => {
    expect(loadCards()).toEqual([]);
  });

  test("returns [] on malformed JSON", () => {
    window.localStorage.setItem("flashcards", "{not json");
    expect(loadCards()).toEqual([]);
  });

  test("returns [] when stored value is not an array", () => {
    window.localStorage.setItem("flashcards", JSON.stringify({ a: 1 }));
    expect(loadCards()).toEqual([]);
  });

  test("filters out invalid card entries", () => {
    window.localStorage.setItem(
      "flashcards",
      JSON.stringify([
        { id: "1", word: "a", definition: "x" },
        { id: 2, word: "bad-id" },
        null,
        "string",
        { id: "3", word: "b", definition: "y" },
      ]),
    );
    // The storage event invalidates the snapshot cache so loadCards re-reads.
    window.dispatchEvent(new StorageEvent("storage", { key: "flashcards" }));
    const cards = loadCards();
    expect(cards.map((c) => c.id)).toEqual(["1", "3"]);
  });

  test("returns a referentially stable snapshot between reads", () => {
    addCard({ word: "a", definition: "1" });
    const first = loadCards();
    const second = loadCards();
    expect(first).toBe(second);
  });

  test("snapshot identity changes after a write", () => {
    addCard({ word: "a", definition: "1" });
    const before = loadCards();
    addCard({ word: "b", definition: "2" });
    const after = loadCards();
    expect(after).not.toBe(before);
    expect(after).toHaveLength(2);
  });
});

describe("saveCards", () => {
  test("overwrites stored value", () => {
    addCard({ word: "a", definition: "1" });
    saveCards([
      {
        id: "x",
        word: "only",
        definition: "one",
        correctCount: 0,
        wrongCount: 0,
        createdAt: 0,
        lastReviewedAt: null,
      },
    ]);
    expect(loadCards().map((c) => c.id)).toEqual(["x"]);
  });
});

describe("normalizeImported", () => {
  test("drops entries missing word or definition", () => {
    const result = normalizeImported([
      { word: "a", definition: "1" },
      { word: "", definition: "2" },
      { word: "b" },
      null,
      { word: "c", definition: "3" },
    ]);
    expect(result.map((c) => c.word)).toEqual(["a", "c"]);
  });

  test("preserves provided id and counts", () => {
    const [c] = normalizeImported([
      {
        id: "keep-me",
        word: "w",
        definition: "d",
        correctCount: 7,
        wrongCount: 3,
        createdAt: 123,
        lastReviewedAt: 456,
      },
    ]);
    expect(c.id).toBe("keep-me");
    expect(c.correctCount).toBe(7);
    expect(c.wrongCount).toBe(3);
    expect(c.createdAt).toBe(123);
    expect(c.lastReviewedAt).toBe(456);
  });

  test("generates id and fills defaults when missing", () => {
    const [c] = normalizeImported([{ word: "w", definition: "d" }]);
    expect(c.id).toMatch(/.+/);
    expect(c.correctCount).toBe(0);
    expect(c.wrongCount).toBe(0);
    expect(c.lastReviewedAt).toBeNull();
    expect(c.createdAt).toBeGreaterThan(0);
  });

  test("returns [] for non-array input", () => {
    expect(normalizeImported({ a: 1 })).toEqual([]);
    expect(normalizeImported(null)).toEqual([]);
    expect(normalizeImported("string")).toEqual([]);
  });

  test("ignores non-finite or non-number count fields", () => {
    const [c] = normalizeImported([
      {
        word: "w",
        definition: "d",
        correctCount: "5",
        wrongCount: NaN,
      },
    ]);
    expect(c.correctCount).toBe(0);
    expect(c.wrongCount).toBe(0);
  });
});
