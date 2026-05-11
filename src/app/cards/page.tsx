"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { clearAll, deleteCard, saveCards, useCards } from "@/lib/storage";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";

const EMPTY: never[] = [];

export default function CardsPage() {
  const cards = useCards() ?? EMPTY;
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q),
    );
  }, [cards, query]);

  const onDelete = (id: string, word: string) => {
    if (!confirm(`Delete "${word}"?`)) return;
    deleteCard(id);
  };

  const onClearAll = () => {
    if (cards.length === 0) return;
    if (!confirm(`Delete all ${cards.length} cards? This cannot be undone.`))
      return;
    clearAll();
  };

  const onExportJSON = () => {
    download("flashcards.json", toJSON(cards), "application/json");
  };
  const onExportCSV = () => {
    download("flashcards.csv", toCSV(cards), "text/csv");
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const incoming = parseFile(file.name, text);
    if (incoming.length === 0) {
      alert("No valid cards found in file.");
      return;
    }
    const mode = confirm(
      `Import ${incoming.length} cards.\n\nOK = merge with existing\nCancel = replace all`,
    )
      ? "merge"
      : "replace";
    if (mode === "replace") {
      if (
        !confirm(
          `This will REPLACE all ${cards.length} existing cards. Continue?`,
        )
      )
        return;
      saveCards(incoming);
    } else {
      saveCards([...incoming, ...cards]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cards</h1>
        <span className="text-sm opacity-60">({cards.length})</span>
        <Link
          href="/add"
          className="ml-auto rounded bg-foreground text-background px-3 py-1.5 text-sm"
        >
          + Add
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground text-sm"
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border border-black/15 dark:border-white/20 px-3 py-1.5"
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={onExportJSON}
          disabled={cards.length === 0}
          className="rounded border border-black/15 dark:border-white/20 px-3 py-1.5 disabled:opacity-40"
        >
          Export JSON
        </button>
        <button
          onClick={onExportCSV}
          disabled={cards.length === 0}
          className="rounded border border-black/15 dark:border-white/20 px-3 py-1.5 disabled:opacity-40"
        >
          Export CSV
        </button>
        <button
          onClick={onClearAll}
          disabled={cards.length === 0}
          className="rounded border border-red-500/40 text-red-600 dark:text-red-400 px-3 py-1.5 disabled:opacity-40 ml-auto"
        >
          Clear all
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 opacity-60 text-sm">
          {cards.length === 0 ? "No cards yet." : "No matches."}
        </div>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
          {filtered.map((c) => (
            <li key={c.id} className="py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.word}</div>
                <div className="text-sm opacity-70 truncate">
                  {c.definition}
                </div>
                <div className="text-xs opacity-50 mt-0.5">
                  ✓ {c.correctCount} · ✗ {c.wrongCount}
                  {c.lastReviewedAt && (
                    <> · {formatRelative(c.lastReviewedAt)}</>
                  )}
                </div>
              </div>
              <div className="flex gap-1 text-xs shrink-0">
                <Link
                  href={`/cards/${c.id}`}
                  className="rounded border border-black/15 dark:border-white/20 px-2 py-1"
                >
                  Edit
                </Link>
                <button
                  onClick={() => onDelete(c.id, c.word)}
                  className="rounded border border-red-500/40 text-red-600 dark:text-red-400 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}
