"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCard } from "@/lib/storage";

export default function AddPage() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const save = (then: "more" | "list") => {
    if (!word.trim() || !definition.trim()) return;
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
        <Field label="Word">
          <input
            autoFocus
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground"
          />
        </Field>

        <Field label="Definition">
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={3}
            className="w-full rounded border border-black/15 dark:border-white/20 px-3 py-2 bg-transparent outline-none focus:border-foreground resize-none"
          />
        </Field>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save("more")}
            disabled={!word.trim() || !definition.trim()}
            className="flex-1 rounded border border-black/15 dark:border-white/20 px-4 py-2 text-sm disabled:opacity-40"
          >
            Save & add another
          </button>
          <button
            type="submit"
            disabled={!word.trim() || !definition.trim()}
            className="flex-1 rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-40"
          >
            Save
          </button>
        </div>

        {savedCount > 0 && (
          <p className="text-xs opacity-70">
            Saved {savedCount} card{savedCount === 1 ? "" : "s"} this session.
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
      {children}
    </label>
  );
}
