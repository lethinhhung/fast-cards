"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MotionPage } from "@/components/MotionPage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TagSelect } from "@/components/TagSelect";
import {
  clearAll,
  deleteCard,
  ensureTagsByName,
  saveCards,
  useCards,
  useTags,
} from "@/lib/storage";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";
import type { Flashcard, Tag } from "@/lib/types";

const EMPTY_CARDS: Flashcard[] = [];
const EMPTY_TAGS: Tag[] = [];

type DeleteTarget = { id: string; word: string };
type ImportPrompt = { incoming: Flashcard[]; existingCount: number };

export default function CardsPage() {
  const cards = useCards() ?? EMPTY_CARDS;
  const tags = useTags() ?? EMPTY_TAGS;
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [importPrompt, setImportPrompt] = useState<ImportPrompt | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<Flashcard[] | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const tagsById = useMemo(
    () => new Map(tags.map((t) => [t.id, t])),
    [tags],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (
        tagFilter.length > 0 &&
        !tagFilter.every((id) => c.tags.includes(id))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.word.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q)
      );
    });
  }, [cards, query, tagFilter]);

  const onExportJSON = () =>
    download(
      "flashcards.json",
      toJSON(cards, tagsById),
      "application/json",
    );
  const onExportCSV = () =>
    download(
      "flashcards.csv",
      toCSV(cards, tagsById),
      "text/csv;charset=utf-8",
    );

  const onImport = async (file: File) => {
    const text = await file.text();
    const incoming = parseFile(file.name, text, (name) =>
      tempTagId(name),
    );
    if (incoming.length === 0) {
      alert("No valid cards found in file.");
      return;
    }
    setImportPrompt({ incoming, existingCount: cards.length });
  };

  const commitImport = (incoming: Flashcard[], mode: "merge" | "replace") => {
    // Tag IDs in `incoming` are the placeholder `tag:<name>` form produced
    // by `tempTagId`. Resolve them to real Tag ids, creating tags as needed.
    const allNames = new Set<string>();
    for (const c of incoming) {
      for (const t of c.tags) {
        if (t.startsWith("tag:")) allNames.add(t.slice(4));
      }
    }
    const ids = ensureTagsByName(Array.from(allNames));
    const nameToId = new Map<string, string>();
    Array.from(allNames).forEach((n, i) => nameToId.set(n, ids[i]));
    const remap = (raw: string) =>
      raw.startsWith("tag:") ? nameToId.get(raw.slice(4)) ?? "" : raw;
    const fixed: Flashcard[] = incoming.map((c) => ({
      ...c,
      tags: c.tags.map(remap).filter((id): id is string => Boolean(id)),
    }));
    if (mode === "merge") saveCards([...fixed, ...cards]);
    else saveCards(fixed);
  };

  return (
    <MotionPage>
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cards</h1>
        <motion.span
          key={cards.length}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
        >
          <Badge variant="secondary">{cards.length}</Badge>
        </motion.span>
        <motion.div
          className="ml-auto"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Button asChild size="sm">
            <Link href="/add">+ Add</Link>
          </Button>
        </motion.div>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
      />

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Filter by tag
          </div>
          <TagSelect selected={tagFilter} onChange={setTagFilter} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          Import
        </Button>
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
        <Button
          variant="outline"
          size="sm"
          onClick={onExportJSON}
          disabled={cards.length === 0}
        >
          Export JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          disabled={cards.length === 0}
        >
          Export CSV
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setClearOpen(true)}
          disabled={cards.length === 0}
          className="ml-auto"
        >
          Clear all
        </Button>
      </div>

      {filtered.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 text-sm text-muted-foreground"
        >
          {cards.length === 0 ? "No cards yet." : "No matches."}
        </motion.div>
      ) : (
        <ul className="rounded-md border divide-y overflow-hidden">
          <AnimatePresence initial={false}>
          {filtered.map((c, i) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40, height: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{
                type: "spring",
                stiffness: 360,
                damping: 30,
                delay: Math.min(i * 0.025, 0.2),
              }}
              className="p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.word}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                  {c.definition}
                </div>
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.tags.map((id) => {
                      const t = tagsById.get(id);
                      if (!t) return null;
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="h-5 px-1.5 text-xs"
                        >
                          {t.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                  <span>✓ {c.correctCount}</span>
                  <span>✗ {c.wrongCount}</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>Added {formatRelative(c.createdAt)}</span>
                  {c.lastReviewedAt && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <span>Reviewed {formatRelative(c.lastReviewedAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/cards/${c.id}`}>Edit</Link>
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPendingDelete({ id: c.id, word: c.word })}
                  >
                    Delete
                  </Button>
                </motion.div>
              </div>
            </motion.li>
          ))}
          </AnimatePresence>
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.word}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteCard(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all cards?</AlertDialogTitle>
            <AlertDialogDescription>
              All {cards.length} cards will be permanently removed. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                setClearOpen(false);
              }}
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={importPrompt !== null}
        onOpenChange={(o) => !o && setImportPrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {importPrompt?.incoming.length} cards
            </AlertDialogTitle>
            <AlertDialogDescription>
              Merge with your existing {importPrompt?.existingCount} cards, or
              replace them entirely?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (importPrompt) setConfirmReplace(importPrompt.incoming);
                setImportPrompt(null);
              }}
            >
              Replace
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (importPrompt) commitImport(importPrompt.incoming, "merge");
                setImportPrompt(null);
              }}
            >
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmReplace !== null}
        onOpenChange={(o) => !o && setConfirmReplace(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all cards?</AlertDialogTitle>
            <AlertDialogDescription>
              Your existing {cards.length} cards will be deleted and replaced
              with {confirmReplace?.length} imported cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReplace) commitImport(confirmReplace, "replace");
                setConfirmReplace(null);
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </MotionPage>
  );
}

function tempTagId(name: string): string {
  return `tag:${name}`;
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
