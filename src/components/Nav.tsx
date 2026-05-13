import Link from "next/link";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Study" },
  { href: "/cards", label: "Cards" },
  { href: "/add", label: "Add" },
];

export function Nav() {
  return (
    <nav className="border-b">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-semibold text-base">
          fast-cards
        </Link>
        <div className="flex gap-1 ml-auto">
          {links.map((l) => (
            <Button
              key={l.href}
              asChild
              variant="ghost"
              className="h-10 px-4 text-base"
            >
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
