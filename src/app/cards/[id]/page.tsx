"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapse } from "@/components/Collapse";
import { TagSelect } from "@/components/TagSelect";
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
      <Button onClick={() => router.push("/cards")}>Back to cards</Button>
    </div>
  );
}

function EditForm({ card }: { card: Flashcard }) {
  const router = useRouter();
  const [word, setWord] = useState(card.word);
  const [definition, setDefinition] = useState(card.definition);
  const [tags, setTags] = useState<string[]>(card.tags);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cards = useCards();

  const valid = word.trim() && definition.trim();
  const duplicate = cards?.find(
    (c) =>
      c.id !== card.id && c.word.toLowerCase() === word.trim().toLowerCase(),
  );

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateCard(card.id, {
      word: word.trim(),
      definition: definition.trim(),
      tags,
    });
    router.push("/cards");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit card</h1>

      <form onSubmit={onSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="word">Word</Label>
          <Input
            id="word"
            autoFocus
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
        </div>

        <Collapse show={duplicate !== undefined}>
          <p className="text-sm text-amber-600 dark:text-amber-500">
            A card for &ldquo;{duplicate?.word}&rdquo; already exists.
          </p>
        </Collapse>

        <div className="space-y-1.5">
          <Label htmlFor="definition">Definition</Label>
          <Textarea
            id="definition"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tags</Label>
          <TagSelect selected={tags} onChange={setTags} />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/cards")}
            className="ml-auto"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{card.word}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteCard(card.id);
                router.push("/cards");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
