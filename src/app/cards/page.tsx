"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Tag as TagIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { BulkTagMenu } from "@/components/BulkTagMenu";
import { TagSelect } from "@/components/TagSelect";
import {
  applyTagsToCards,
  clearAll,
  deleteCard,
  ensureTagsByName,
  saveCards,
  useCards,
  useTags,
} from "@/lib/storage";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";
import { spring } from "@/lib/animation";
import { matchesTagFilter } from "@/lib/tagFilter";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Shift-click range selection: anchor index of the last toggled row, and
  // whether the in-flight checkbox change came from a shift-click.
  const lastIndexRef = useRef<number | null>(null);
  const shiftRef = useRef(false);

  const tagsById = useMemo(
    () => new Map(tags.map((t) => [t.id, t])),
    [tags],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (!matchesTagFilter(c.tags, tagFilter)) return false;
      if (!q) return true;
      return (
        c.word.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q)
      );
    });
  }, [cards, query, tagFilter]);

  // Selection only ever refers to visible cards: ids whose cards were
  // deleted, or which dropped out of the filter (e.g. untagged cards that
  // just got bulk-tagged), are pruned automatically.
  const selectedCards = useMemo(
    () => filtered.filter((c) => selected.has(c.id)),
    [filtered, selected],
  );
  const allSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id));

  const clearSelection = () => {
    setSelected(new Set());
    lastIndexRef.current = null;
  };

  const toggleSelect = (id: string, index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const on = !next.has(id);
      if (shiftRef.current && lastIndexRef.current !== null) {
        const lo = Math.min(lastIndexRef.current, index);
        const hi = Math.max(lastIndexRef.current, index);
        for (let i = lo; i <= hi; i++) {
          if (on) next.add(filtered[i].id);
          else next.delete(filtered[i].id);
        }
      } else if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    lastIndexRef.current = index;
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((c) => next.delete(c.id));
      else filtered.forEach((c) => next.add(c.id));
      return next;
    });
    lastIndexRef.current = null;
  };

  // Selection follows what's visible; changing search/filter resets it so
  // bulk actions never touch cards the user can no longer see.
  const onQueryChange = (v: string) => {
    setQuery(v);
    clearSelection();
  };
  const onTagFilterChange = (next: string[]) => {
    setTagFilter(next);
    clearSelection();
  };

  const onBulkTag = (add: string[], remove: string[]) => {
    applyTagsToCards(
      selectedCards.map((c) => c.id),
      add,
      remove,
    );
    setTagMenuOpen(false);
  };

  const onBulkDelete = () => {
    const ids = new Set(selectedCards.map((c) => c.id));
    saveCards(cards.filter((c) => !ids.has(c.id)));
    clearSelection();
    setBulkDeleteOpen(false);
  };

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cards</h1>
        <Badge variant="secondary">{cards.length}</Badge>
        <Button asChild size="sm" className="ml-auto">
          <Link href="/add">+ Add</Link>
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search…"
      />

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Filter by tag
          </div>
          <TagSelect
            selected={tagFilter}
            onChange={onTagFilterChange}
            untagged
          />
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
        <div className="text-center py-12 text-sm text-muted-foreground">
          {cards.length === 0 ? "No cards yet." : "No matches."}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-3">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">
              {selectedCards.length > 0
                ? `${selectedCards.length} of ${filtered.length} selected`
                : "Select all"}
            </span>
          </div>
          <ul className="rounded-md border divide-y overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
          {filtered.map((c, i) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={spring}
              className={
                "p-3 flex items-start gap-3 transition-colors" +
                (selected.has(c.id) ? " bg-muted/50" : "")
              }
            >
              <Checkbox
                checked={selected.has(c.id)}
                onCheckedChange={() => toggleSelect(c.id, i)}
                onClick={(e) => {
                  shiftRef.current = e.shiftKey;
                }}
                aria-label={`Select ${c.word}`}
                className="mt-0.5"
              />
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
                <Button asChild variant="outline" size="sm">
                  <Link href={`/cards/${c.id}`}>Edit</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPendingDelete({ id: c.id, word: c.word })}
                >
                  Delete
                </Button>
              </div>
            </motion.li>
          ))}
          </AnimatePresence>
          </ul>
        </>
      )}

      {/* Keep the floating bar from covering the last rows. */}
      {selectedCards.length > 0 && <div className="h-12" aria-hidden />}
      <AnimatePresence>
        {selectedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={spring}
            className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border bg-background/95 px-2.5 py-2 shadow-lg backdrop-blur">
            <span className="px-1 text-sm font-medium tabular-nums whitespace-nowrap">
              {selectedCards.length} selected
            </span>
            <Separator orientation="vertical" className="h-4" />
            <Popover open={tagMenuOpen} onOpenChange={setTagMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <TagIcon data-icon="inline-start" />
                  Tags
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-72 p-0">
                <BulkTagMenu cards={selectedCards} onApply={onBulkTag} />
              </PopoverContent>
            </Popover>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear selection"
              onClick={clearSelection}
            >
              <X />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCards.length}{" "}
              {selectedCards.length === 1 ? "card" : "cards"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected cards will be permanently removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
