"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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
import { clearAll, deleteCard, saveCards, useCards } from "@/lib/storage";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";
import type { Flashcard } from "@/lib/types";

const EMPTY: never[] = [];

type DeleteTarget = { id: string; word: string };
type ImportPrompt = { incoming: Flashcard[]; existingCount: number };

export default function CardsPage() {
  const cards = useCards() ?? EMPTY;
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [importPrompt, setImportPrompt] = useState<ImportPrompt | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<Flashcard[] | null>(
    null,
  );
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

  const onExportJSON = () =>
    download("flashcards.json", toJSON(cards), "application/json");
  const onExportCSV = () =>
    download("flashcards.csv", toCSV(cards), "text/csv;charset=utf-8");

  const onImport = async (file: File) => {
    const text = await file.text();
    const incoming = parseFile(file.name, text);
    if (incoming.length === 0) {
      alert("No valid cards found in file.");
      return;
    }
    setImportPrompt({ incoming, existingCount: cards.length });
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
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
      />

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
        <ul className="rounded-md border divide-y">
          {filtered.map((c) => (
            <li key={c.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.word}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {c.definition}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>✓ {c.correctCount}</span>
                  <span>✗ {c.wrongCount}</span>
                  {c.lastReviewedAt && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <span>{formatRelative(c.lastReviewedAt)}</span>
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
            </li>
          ))}
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
                if (importPrompt) {
                  saveCards([...importPrompt.incoming, ...cards]);
                }
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
                if (confirmReplace) saveCards(confirmReplace);
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
