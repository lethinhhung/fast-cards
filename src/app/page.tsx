"use client";

import Link from "next/link";
import { useState } from "react";
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
    <div className="text-center space-y-3 mt-12">
      <h1 className="text-xl font-semibold">No cards yet</h1>
      <p className="text-sm text-muted-foreground">
        Add some to start studying.
      </p>
      <Button asChild>
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
        <p className="text-sm text-muted-foreground">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <Button onClick={onRestart}>Study again</Button>
      </div>
    );
  }

  const pct = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {done} / {total} reviewed
          </span>
          <span>{queue.length} in queue</span>
        </div>
        <Progress value={pct} />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Definition</CardDescription>
          <CardTitle className="text-lg font-normal">
            {current?.definition}
          </CardTitle>
        </CardHeader>
      </Card>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (status === "wrong") setStatus("idle");
          }}
          placeholder="Type the word"
          disabled={status === "wrong"}
        />
        {status === "wrong" ? (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="font-semibold">{current?.word}</span>
            </div>
            <Button type="button" onClick={onNext} className="w-full">
              Next
            </Button>
          </div>
        ) : (
          <Button type="submit" className="w-full">
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
