"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}>
      <Button
        type="button"
        variant="ghost"
        onClick={toggle}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="h-10 w-10 px-0 overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === null ? (
            <span key="placeholder" className="size-4" />
          ) : theme === "dark" ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="inline-flex"
            >
              <Sun className="size-4" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="inline-flex"
            >
              <Moon className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
