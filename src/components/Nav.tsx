import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-black/10 dark:border-white/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4 text-sm">
        <Link href="/" className="font-semibold">
          fast-cards
        </Link>
        <div className="flex gap-4 ml-auto">
          <Link href="/" className="hover:underline">
            Study
          </Link>
          <Link href="/cards" className="hover:underline">
            Cards
          </Link>
          <Link href="/add" className="hover:underline">
            Add
          </Link>
        </div>
      </div>
    </nav>
  );
}
