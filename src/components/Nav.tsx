"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Study" },
  { href: "/cards", label: "Cards" },
  { href: "/tags", label: "Tags" },
  { href: "/add", label: "Add" },
];

export function Nav() {
  const pathname = usePathname();
  const activeHref = links.reduce<string | null>((acc, l) => {
    if (l.href === "/") {
      return pathname === "/" ? l.href : acc;
    }
    return pathname.startsWith(l.href) ? l.href : acc;
  }, null);

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.6 }}
      className="border-b"
    >
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-semibold text-base">
          <motion.span
            whileHover={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            fast-cards
          </motion.span>
        </Link>
        <div className="flex gap-0.5 ml-auto items-center">
          {links.map((l) => {
            const isActive = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative inline-flex h-10 items-center justify-center rounded-md px-4 text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-md bg-accent"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                )}
                <span className="relative z-10">{l.label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
}
