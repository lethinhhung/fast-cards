"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { TagSelect } from "@/components/TagSelect";
import { MotionPage } from "@/components/MotionPage";
import { updateCard, useCards, useTags } from "@/lib/storage";
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
      className="text-center space-y-4 mt-16"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <motion.div
        className="text-6xl"
        initial={{ rotate: -20, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 12,
          delay: 0.15,
        }}
      >
        ⚡
      </motion.div>
      <h1 className="text-3xl font-semibold">No cards yet</h1>
      <p className="text-base text-muted-foreground">
        Add some to start studying.
      </p>
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
        <Button asChild className="h-11 px-5 text-base">
          <Link href="/add">Add a card</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 26 },
  },
};

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
  const filtered = useMemo(() => {
    if (filter.length === 0) return cards;
    return cards.filter((c) => filter.every((id) => c.tags.includes(id)));
  }, [cards, filter]);

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div className="space-y-1" variants={item}>
        <h1 className="text-2xl font-semibold">Study</h1>
        <p className="text-sm text-muted-foreground">
          Pick tags to narrow the session, or leave empty to study all cards.
        </p>
      </motion.div>

      <motion.div className="space-y-2" variants={item}>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Filter by tag
        </div>
        <TagSelect selected={filter} onChange={onFilterChange} />
      </motion.div>

      <motion.div
        className="text-sm text-muted-foreground"
        variants={item}
        key={filtered.length}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {filtered.length} {filtered.length === 1 ? "card" : "cards"} match.
      </motion.div>

      <motion.div variants={item} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => onStart(filtered)}
          disabled={filtered.length === 0}
          className="w-full h-12 text-base"
        >
          Start
        </Button>
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
        className="text-center space-y-4 mt-16"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <motion.div
          className="text-7xl"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: [0, 1.3, 1], rotate: [180, 0, 0] }}
          transition={{
            duration: 0.8,
            times: [0, 0.6, 1],
            ease: "easeOut",
          }}
        >
          🎉
        </motion.div>
        <h1 className="text-3xl font-semibold">Session complete</h1>
        <p className="text-base text-muted-foreground">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <motion.div
          className="flex justify-center gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              variant="outline"
              onClick={onChangeFilter}
              className="h-11 px-5 text-base"
            >
              Change filter
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button onClick={onRestart} className="h-11 px-5 text-base">
              Study again
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  const pct = total === 0 ? 0 : (done / total) * 100;
  const wrong = status === "wrong";

  return (
    <MotionPage>
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

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current?.id ?? "empty"}
              initial={{ opacity: 0, x: 32, rotateY: -8 }}
              animate={{
                opacity: 1,
                x: 0,
                rotateY: 0,
                ...(wrong
                  ? { x: [0, -10, 10, -8, 8, -4, 0] }
                  : {}),
              }}
              exit={{ opacity: 0, x: -32, rotateY: 8 }}
              transition={
                wrong
                  ? { duration: 0.45 }
                  : { type: "spring", stiffness: 280, damping: 28 }
              }
              style={{ perspective: 1000 }}
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
        </div>

        <AnimatePresence>
          {wrong && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-4 text-destructive"
            >
              <div className="text-sm font-medium uppercase tracking-wider">
                Incorrect
              </div>
              <div className="mt-1 text-base">
                <span className="opacity-80">Answer: </span>
                <motion.span
                  className="text-lg font-semibold inline-block"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 18,
                    delay: 0.1,
                  }}
                >
                  {current?.word}
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          <AnimatePresence mode="wait" initial={false}>
            {wrong ? (
              <motion.div
                key="next"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={onNext}
                  className="w-full h-12 text-base"
                >
                  Next
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="check"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button type="submit" className="w-full h-12 text-base">
                  Check
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </MotionPage>
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
