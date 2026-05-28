"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MotionPage } from "@/components/MotionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagSelect } from "@/components/TagSelect";
import { addCard, useCards } from "@/lib/storage";

export default function AddPage() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const cards = useCards();

  const valid = word.trim() && definition.trim();
  const duplicate = cards?.find(
    (c) => c.word.toLowerCase() === word.trim().toLowerCase(),
  );

  const save = (then: "more" | "list") => {
    if (!valid) return;
    addCard({ word, definition, tags });
    if (then === "more") {
      setWord("");
      setDefinition("");
      setSavedCount((n) => n + 1);
    } else {
      router.push("/cards");
    }
  };

  return (
    <MotionPage>
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Add card</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save("list");
        }}
        className="space-y-4"
      >
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
          <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => save("more")}
              disabled={!valid}
              className="w-full"
            >
              Save & add another
            </Button>
          </motion.div>
          <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
            <Button type="submit" disabled={!valid} className="w-full">
              Save
            </Button>
          </motion.div>
        </div>

        <AnimatePresence>
          {savedCount > 0 && (
            <motion.p
              key={savedCount}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground"
            >
              Saved {savedCount} card{savedCount === 1 ? "" : "s"} this session.
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </div>
    </MotionPage>
  );
}
