"use client";

import Link from "next/link";
import { useTags } from "@/lib/storage";
import { UNTAGGED } from "@/lib/tagFilter";
import { Badge } from "@/components/ui/badge";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint?: React.ReactNode;
  /**
   * Show an "Untagged" option for filter contexts. Mutually exclusive with
   * real tags: picking it clears them and vice versa.
   */
  untagged?: boolean;
};

export function TagSelect({ selected, onChange, emptyHint, untagged }: Props) {
  const tags = useTags();
  if (tags === null) return null;

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyHint ?? (
          <>
            No tags yet.{" "}
            <Link href="/tags" className="underline">
              Create one
            </Link>
            .
          </>
        )}
      </p>
    );
  }

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((t) => t !== id));
    else if (id === UNTAGGED) onChange([UNTAGGED]);
    else onChange([...selected.filter((t) => t !== UNTAGGED), id]);
  };

  const untaggedOn = selected.includes(UNTAGGED);

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-pressed={on}
            className="focus:outline-none"
          >
            <Badge
              variant={on ? "default" : "outline"}
              className="cursor-pointer h-7 px-2.5 text-sm"
            >
              {t.name}
            </Badge>
          </button>
        );
      })}
      {untagged && (
        <button
          type="button"
          onClick={() => toggle(UNTAGGED)}
          aria-pressed={untaggedOn}
          className="focus:outline-none"
        >
          <Badge
            variant={untaggedOn ? "default" : "outline"}
            className="cursor-pointer h-7 px-2.5 text-sm border-dashed"
          >
            Untagged
          </Badge>
        </button>
      )}
    </div>
  );
}
