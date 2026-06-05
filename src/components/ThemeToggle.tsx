"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";

// Tiny module-level store: the theme is global, only known client-side
// (localStorage / media query), and the server snapshot of `null` keeps
// the first paint hydration-safe.
let cached: Theme | null = null;
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Theme {
  if (cached === null) cached = resolveTheme();
  return cached;
}

function setTheme(next: Theme) {
  applyTheme(next);
  cached = next;
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const toggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="h-10 w-10 px-0"
    >
      {theme === null ? (
        <span className="size-4" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="inline-flex"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </Button>
  );
}
