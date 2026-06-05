"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Collapse } from "@/components/Collapse";
import { TagSelect } from "@/components/TagSelect";
import { fadeUp, pop, springGentle, stagger } from "@/lib/animation";
import { updateCard, useCards, useTags } from "@/lib/storage";
import { matchesTagFilter } from "@/lib/tagFilter";
import type { Flashcard } from "@/lib/types";

export default function StudyPage() {
  const cards = useCards();
  const tags = useTags();
  const [filter, setFilter] = useState<string[]>([]);
  const [session, setSession] = useState<{ cards: Flashcard[]; key: number } | null>(
    null,
  );

  if (cards === null || tags === null) return null;
  if (cards.length === 0) return <EmptyState />;

  if (session) {
    return (
      <Session
        key={session.key}
        initial={session.cards}
        onChangeFilter={() => setSession(null)}
        onRestart={() =>
          setSession((s) => (s ? { cards: s.cards, key: s.key + 1 } : s))
        }
      />
    );
  }

  return (
    <Start
      cards={cards}
      filter={filter}
      onFilterChange={setFilter}
      onStart={(filtered) => setSession({ cards: filtered, key: 0 })}
    />
  );
}

function EmptyState() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="text-center space-y-4 mt-16"
    >
      <motion.h1 variants={fadeUp} className="text-3xl font-semibold">
        No cards yet
      </motion.h1>
      <motion.p variants={fadeUp} className="text-base text-muted-foreground">
        Add some to start studying.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Button asChild className="h-11 px-5 text-base">
          <Link href="/add">Add a card</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Start({
  cards,
  filter,
  onFilterChange,
  onStart,
}: {
  cards: Flashcard[];
  filter: string[];
  onFilterChange: (next: string[]) => void;
  onStart: (cards: Flashcard[]) => void;
}) {
  const filtered = useMemo(
    () => cards.filter((c) => matchesTagFilter(c.tags, filter)),
    [cards, filter],
  );

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="space-y-1">
        <h1 className="text-2xl font-semibold">Study</h1>
        <p className="text-sm text-muted-foreground">
          Pick tags to narrow the session, or leave empty to study all cards.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Filter by tag
        </div>
        <TagSelect selected={filter} onChange={onFilterChange} untagged />
      </motion.div>

      <motion.div variants={fadeUp} className="text-sm text-muted-foreground">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={filtered.length}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="inline-block tabular-nums"
          >
            {filtered.length} {filtered.length === 1 ? "card" : "cards"} match.
          </motion.span>
        </AnimatePresence>
      </motion.div>

      <motion.div variants={fadeUp}>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => onStart(filtered)}
            disabled={filtered.length === 0}
            className="w-full h-12 text-base"
          >
            Start
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type Status = "idle" | "wrong";

function Session({
  initial,
  onRestart,
  onChangeFilter,
}: {
  initial: Flashcard[];
  onRestart: () => void;
  onChangeFilter: () => void;
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
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center space-y-4 mt-16"
      >
        <motion.div
          variants={pop}
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="size-7" />
        </motion.div>
        <motion.h1 variants={fadeUp} className="text-3xl font-semibold">
          Session complete
        </motion.h1>
        <motion.p variants={fadeUp} className="text-base text-muted-foreground">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </motion.p>
        <motion.div variants={fadeUp} className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={onChangeFilter}
            className="h-11 px-5 text-base"
          >
            Change filter
          </Button>
          <Button onClick={onRestart} className="h-11 px-5 text-base">
            Study again
          </Button>
        </motion.div>
      </motion.div>
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

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={current?.id}
          initial={{ opacity: 0, x: 48, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -48, scale: 0.98 }}
          transition={springGentle}
        >
          <Card className="py-10">
            <CardHeader className="space-y-3">
              <CardDescription className="text-sm uppercase tracking-wider">
                Definition
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-normal leading-snug whitespace-pre-wrap">
                {current?.definition}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
      </AnimatePresence>

      <Collapse show={wrong}>
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
      </Collapse>

      <form onSubmit={onSubmit} className="space-y-4">
        <motion.div
          animate={wrong ? "shake" : "idle"}
          variants={{
            idle: { x: 0 },
            shake: {
              x: [0, -10, 10, -8, 8, -4, 4, 0],
              transition: { duration: 0.4 },
            },
          }}
        >
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
        </motion.div>
        <motion.div whileTap={{ scale: 0.98 }}>
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
        </motion.div>
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
