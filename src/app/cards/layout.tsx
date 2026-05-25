import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cards",
  description:
    "Browse, search, import, and export your flashcard collection.",
};

export default function CardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
