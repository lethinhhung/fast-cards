"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { deleteCard, updateCard, useCards } from "@/lib/storage";
import type { Flashcard } from "@/lib/types";

export default function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cards = useCards();
  if (cards === null) return null;
  const card = cards.find((c) => c.id === id);
  if (!card) return <NotFound />;
  return <EditForm key={card.id} card={card} />;
}

function NotFound() {
  const router = useRouter();
  return (
    <div className="text-center space-y-3 mt-12">
      <h1 className="text-xl font-semibold">Card not found</h1>
      <button
        onClick={() => router.push("/cards")}
        className="rounded bg-foreground text-background px-4 py-2 text-sm"
      >
        Back to cards
      </button>
    </div>
  );
}

function EditForm({ card }: { card: Flashcard }) {
  const router = useRouter();
  const [word, setWord] = useState(card.word);
  const [definition, setDefinition] = useState(card.definition);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;
    updateCard(card.id, { word: word.trim(), definition: definition.trim() });
    router.push("/cards");
  };

  const onDelete = () => {
    if (!confirm(`Delete "${card.word}"?`)) return;
    deleteCard(card.id);
    router.push("/cards");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit card</h1>

      <form onSubmit={onSave} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide opacity-60">
            Word
          </span>
          <input
            autoFocus
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide opacity-60">
            Definition
          </span>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={3}
            className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground resize-none"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-red-500/40 text-red-600 dark:text-red-400 px-4 py-2 text-sm"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => router.push("/cards")}
            className="ml-auto rounded border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!word.trim() || !definition.trim()}
            className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
