"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useTags } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint?: React.ReactNode;
};

export function TagSelect({ selected, onChange, emptyHint }: Props) {
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
    else onChange([...selected, id]);
  };

  return (
    <motion.div
      className="flex flex-wrap gap-1.5"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.03 } },
      }}
    >
      {tags.map((t) => {
        const on = selected.includes(t.id);
        return (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-pressed={on}
            className="focus:outline-none"
            variants={{
              hidden: { opacity: 0, scale: 0.85 },
              show: { opacity: 1, scale: 1 },
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <Badge
              variant={on ? "default" : "outline"}
              className="cursor-pointer h-7 px-2.5 text-sm transition-colors"
            >
              {t.name}
            </Badge>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
