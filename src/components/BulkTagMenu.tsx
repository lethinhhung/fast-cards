"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addTag, useTags } from "@/lib/storage";
import type { Flashcard, Tag } from "@/lib/types";

const EMPTY_TAGS: Tag[] = [];

type Props = {
  /** The currently selected cards the changes will apply to. */
  cards: Flashcard[];
  /** Commit staged changes: tag ids to add to / remove from every card. */
  onApply: (add: string[], remove: string[]) => void;
};

/**
 * Gmail-labels-style bulk tag editor. Each tag shows a tri-state checkbox:
 * checked = every selected card has it, indeterminate = some do, empty = none.
 * Clicks stage add/remove changes; nothing is written until Apply.
 */
export function BulkTagMenu({ cards, onApply }: Props) {
  const tags = useTags() ?? EMPTY_TAGS;
  const [query, setQuery] = useState("");
  // tagId -> true (add to all) | false (remove from all)
  const [staged, setStaged] = useState<Map<string, boolean>>(new Map());

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) {
      for (const id of c.tags) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [cards]);

  const sorted = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
    [tags],
  );

  const q = query.trim().toLowerCase();
  const visible = q
    ? sorted.filter((t) => t.name.toLowerCase().includes(q))
    : sorted;
  const canCreate =
    q.length > 0 && !tags.some((t) => t.name.toLowerCase() === q);

  const baseState = (id: string): boolean | "indeterminate" => {
    const n = counts.get(id) ?? 0;
    if (n === 0) return false;
    return n === cards.length ? true : "indeterminate";
  };

  const effectiveState = (id: string): boolean | "indeterminate" => {
    const s = staged.get(id);
    return s === undefined ? baseState(id) : s;
  };

  const toggle = (id: string) => {
    const next = effectiveState(id) !== true;
    setStaged((prev) => {
      const m = new Map(prev);
      // Staging back to the original state is a no-op — drop the entry so
      // Apply stays disabled when nothing actually changes.
      if (next === baseState(id)) m.delete(id);
      else m.set(id, next);
      return m;
    });
  };

  const create = () => {
    const tag = addTag(query);
    if (!tag) return;
    setStaged((prev) => new Map(prev).set(tag.id, true));
    setQuery("");
  };

  const apply = () => {
    const add: string[] = [];
    const remove: string[] = [];
    for (const [id, on] of staged) (on ? add : remove).push(id);
    onApply(add, remove);
  };

  const addCount = [...staged.values()].filter(Boolean).length;
  const removeCount = staged.size - addCount;

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="text-sm font-medium">
          Tag {cards.length} {cards.length === 1 ? "card" : "cards"}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (canCreate) create();
            else if (visible.length === 1) toggle(visible[0].id);
          }}
          placeholder="Search or create tag…"
          className="h-8"
          autoFocus
        />
      </div>

      <div className="max-h-56 overflow-y-auto px-1.5 pb-1.5" role="group">
        {visible.map((t) => {
          const state = effectiveState(t.id);
          const partial = state === "indeterminate";
          return (
            <label
              key={t.id}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm cursor-pointer hover:bg-muted"
            >
              <Checkbox
                checked={state}
                onCheckedChange={() => toggle(t.id)}
                aria-label={`Tag ${t.name}`}
              />
              <span className="flex-1 truncate">{t.name}</span>
              {partial && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts.get(t.id)}/{cards.length}
                </span>
              )}
            </label>
          );
        })}

        {visible.length === 0 && !canCreate && (
          <p className="px-1.5 py-2 text-sm text-muted-foreground">
            No tags yet. Type a name to create one.
          </p>
        )}

        {canCreate && (
          <button
            type="button"
            onClick={create}
            className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm cursor-pointer hover:bg-muted text-left"
          >
            <Plus className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              Create &ldquo;{query.trim()}&rdquo;
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/50 rounded-b-xl px-3 py-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {staged.size === 0
            ? "No changes"
            : [
                addCount > 0 ? `+${addCount}` : null,
                removeCount > 0 ? `−${removeCount}` : null,
              ]
                .filter(Boolean)
                .join(" ")}
        </span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={staged.size === 0}
          onClick={apply}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
