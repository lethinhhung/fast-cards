"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCard, useCards } from "@/lib/storage";

export default function AddPage() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const cards = useCards();

  const valid = word.trim() && definition.trim();
  const duplicate = cards?.find(
    (c) => c.word.toLowerCase() === word.trim().toLowerCase(),
  );

  const save = (then: "more" | "list") => {
    if (!valid) return;
    addCard({ word, definition });
    if (then === "more") {
      setWord("");
      setDefinition("");
      setSavedCount((n) => n + 1);
    } else {
      router.push("/cards");
    }
  };

  return (
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

        {duplicate && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            A card for &ldquo;{duplicate.word}&rdquo; already exists.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="definition">Definition</Label>
          <Textarea
            id="definition"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => save("more")}
            disabled={!valid}
            className="flex-1"
          >
            Save & add another
          </Button>
          <Button type="submit" disabled={!valid} className="flex-1">
            Save
          </Button>
        </div>

        {savedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Saved {savedCount} card{savedCount === 1 ? "" : "s"} this session.
          </p>
        )}
      </form>
    </div>
  );
}
