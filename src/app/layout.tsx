import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://fast-cards-study.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
  title: {
    default: "Fast Cards — Flashcard Study App",
    template: "%s | Fast Cards",
  },
  description:
    "Create, manage, and study flashcards in your browser. Free, private, and no sign-up required.",
  keywords: [
    "flashcards",
    "study",
    "learning",
    "vocabulary",
    "spaced repetition",
    "memorization",
  ],
  openGraph: {
    title: "Fast Cards — Flashcard Study App",
    description:
      "Create, manage, and study flashcards in your browser. Free, private, and no sign-up required.",
    url: BASE_URL,
    siteName: "Fast Cards",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fast Cards — Flashcard Study App",
    description:
      "Create, manage, and study flashcards in your browser. Free, private, and no sign-up required.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          Made by{" "}
          <a
            href="https://thinghunggg.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            thinghunggg
          </a>
        </footer>
      </body>
    </html>
  );
}
