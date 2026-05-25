import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Card",
  description: "Create a new flashcard with a word and definition.",
};

export default function AddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
