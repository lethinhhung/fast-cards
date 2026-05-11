"use client";

import Link from "next/link";
import { useState } from "react";
import { updateCard, useCards } from "@/lib/storage";
import type { Flashcard } from "@/lib/types";

export default function StudyPage() {
  const cards = useCards();
  const [sessionKey, setSessionKey] = useState(0);
  if (cards === null) return null;
  if (cards.length === 0) return <EmptyState />;
  return (
    <Session
      key={sessionKey}
      initial={cards}
      onRestart={() => setSessionKey((k) => k + 1)}
    />
  );
}

function EmptyState() {
  return (
    <div className="text-center space-y-3 mt-12">
      <h1 className="text-xl font-semibold">No cards yet</h1>
      <p className="text-sm opacity-70">Add some to start studying.</p>
      <Link
        href="/add"
        className="inline-block rounded bg-foreground text-background px-4 py-2 text-sm"
      >
        Add a card
      </Link>
    </div>
  );
}

type Status = "idle" | "wrong";

function Session({
  initial,
  onRestart,
}: {
  initial: Flashcard[];
  onRestart: () => void;
}) {
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(initial));
  const [total] = useState(initial.length);
  const [done, setDone] = useState(0);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const current = queue[0];
  const finished = queue.length === 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    const correct =
      input.trim().toLowerCase() === current.word.trim().toLowerCase();
    if (correct) {
      updateCard(current.id, {
        correctCount: current.correctCount + 1,
        lastReviewedAt: Date.now(),
      });
      setQueue((q) => q.slice(1));
      setDone((d) => d + 1);
      setInput("");
      setStatus("idle");
    } else {
      setStatus("wrong");
    }
  };

  const onNext = () => {
    if (!current) return;
    updateCard(current.id, {
      wrongCount: current.wrongCount + 1,
      lastReviewedAt: Date.now(),
    });
    setQueue((q) => {
      const [head, ...rest] = q;
      const insertAt = Math.min(3, rest.length);
      const next = [...rest];
      next.splice(insertAt, 0, head);
      return next;
    });
    setInput("");
    setStatus("idle");
  };

  if (finished) {
    return (
      <div className="text-center space-y-3 mt-12">
        <h1 className="text-xl font-semibold">Session complete</h1>
        <p className="text-sm opacity-70">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <button
          onClick={onRestart}
          className="rounded bg-foreground text-background px-4 py-2 text-sm"
        >
          Study again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Progress done={done} total={total} remaining={queue.length} />

      <div className="rounded-lg border border-black/10 dark:border-white/15 p-6 text-center">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">
          Definition
        </div>
        <div className="text-lg">{current?.definition}</div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (status === "wrong") setStatus("idle");
          }}
          placeholder="Type the word"
          disabled={status === "wrong"}
          className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground"
        />
        {status === "wrong" ? (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="opacity-60">Answer: </span>
              <span className="font-semibold">{current?.word}</span>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="w-full rounded bg-foreground text-background px-4 py-2 text-sm"
            >
              Next
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className="w-full rounded bg-foreground text-background px-4 py-2 text-sm"
          >
            Check
          </button>
        )}
      </form>
    </div>
  );
}

function Progress({
  done,
  total,
  remaining,
}: {
  done: number;
  total: number;
  remaining: number;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs opacity-70">
        <span>
          {done} / {total} reviewed
        </span>
        <span>{remaining} in queue</span>
      </div>
      <div className="h-1 rounded bg-black/10 dark:bg-white/15 overflow-hidden">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
