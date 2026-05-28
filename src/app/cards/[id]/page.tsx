"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <motion.div
      className="text-center space-y-3 mt-12"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
    >
      <h1 className="text-xl font-semibold">Card not found</h1>
      <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
        <Button onClick={() => router.push("/cards")}>Back to cards</Button>
      </motion.div>
    </motion.div>
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
    <MotionPage>
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

        <AnimatePresence>
          {duplicate && (
            <motion.p
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="text-sm text-amber-600 dark:text-amber-500"
            >
              A card for &ldquo;{duplicate.word}&rdquo; already exists.
            </motion.p>
          )}
        </AnimatePresence>

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
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </motion.div>
          <motion.div className="ml-auto" whileTap={{ scale: 0.96 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/cards")}
            >
              Cancel
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </motion.div>
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
    </MotionPage>
  );
}
