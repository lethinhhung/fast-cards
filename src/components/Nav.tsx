"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { spring } from "@/lib/animation";

const links = [
  { href: "/", label: "Study" },
  { href: "/cards", label: "Cards" },
  { href: "/tags", label: "Tags" },
  { href: "/add", label: "Add" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-semibold text-base">
          fast-cards
        </Link>
        <div className="flex gap-1 ml-auto items-center">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "relative inline-flex h-10 items-center rounded-md px-4 text-base font-medium transition-colors" +
                  (active
                    ? " text-foreground"
                    : " text-muted-foreground hover:text-foreground")
                }
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-muted"
                    transition={spring}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
