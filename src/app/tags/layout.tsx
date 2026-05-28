import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags",
  description: "Create, rename, and delete tags used to group your cards.",
};

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
