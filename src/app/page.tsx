"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
    <div className="text-center space-y-4 mt-16">
      <h1 className="text-3xl font-semibold">No cards yet</h1>
      <p className="text-base text-muted-foreground">
        Add some to start studying.
      </p>
      <Button asChild className="h-11 px-5 text-base">
        <Link href="/add">Add a card</Link>
      </Button>
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
  const inputRef = useRef<HTMLInputElement>(null);

  const current = queue[0];
  const finished = queue.length === 0;

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [status, current?.id, finished]);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (status === "wrong") {
      onNext();
      return;
    }
    const value = input.trim();
    if (!value) return;
    const correct = value.toLowerCase() === current.word.trim().toLowerCase();
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

  if (finished) {
    return (
      <div className="text-center space-y-4 mt-16">
        <h1 className="text-3xl font-semibold">Session complete</h1>
        <p className="text-base text-muted-foreground">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <Button onClick={onRestart} className="h-11 px-5 text-base">
          Study again
        </Button>
      </div>
    );
  }

  const pct = total === 0 ? 0 : (done / total) * 100;
  const wrong = status === "wrong";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {done} / {total} reviewed
          </span>
          <span>{queue.length} in queue</span>
        </div>
        <Progress value={pct} className="h-2.5" />
      </div>

      <Card className="py-10">
        <CardHeader className="space-y-3">
          <CardDescription className="text-sm uppercase tracking-wider">
            Definition
          </CardDescription>
          <CardTitle className="text-2xl sm:text-3xl font-normal leading-snug">
            {current?.definition}
          </CardTitle>
        </CardHeader>
      </Card>

      {wrong && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-4 text-destructive"
        >
          <div className="text-sm font-medium uppercase tracking-wider">
            Incorrect
          </div>
          <div className="mt-1 text-base">
            <span className="opacity-80">Answer: </span>
            <span className="text-lg font-semibold">{current?.word}</span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (wrong) setStatus("idle");
          }}
          placeholder="Type the word"
          readOnly={wrong}
          aria-invalid={wrong}
          className="h-14 text-lg px-4 md:text-lg"
        />
        {wrong ? (
          <Button
            type="button"
            onClick={onNext}
            className="w-full h-12 text-base"
          >
            Next
          </Button>
        ) : (
          <Button type="submit" className="w-full h-12 text-base">
            Check
          </Button>
        )}
      </form>
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
