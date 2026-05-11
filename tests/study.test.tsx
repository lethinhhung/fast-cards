import { describe, expect, test } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudyPage from "@/app/page";
import { addCard, getCard, loadCards } from "@/lib/storage";

function seed(words: Array<[string, string]>) {
  return words.map(([w, d]) => addCard({ word: w, definition: d }));
}

describe("StudyPage", () => {
  test("shows empty state when no cards", () => {
    render(<StudyPage />);
    expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add a card/i })).toHaveAttribute(
      "href",
      "/add",
    );
  });

  test("correct answer advances to next card and increments correctCount", async () => {
    const [a] = seed([["one", "the number 1"]]);
    const user = userEvent.setup();
    render(<StudyPage />);

    const input = screen.getByPlaceholderText(/type the word/i);
    await user.type(input, "one");
    await user.click(screen.getByRole("button", { name: /check/i }));

    expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    expect(getCard(a.id)?.correctCount).toBe(1);
    expect(getCard(a.id)?.lastReviewedAt).toBeGreaterThan(0);
  });

  test("comparison is case-insensitive and trims input", async () => {
    seed([["Hello", "greeting"]]);
    const user = userEvent.setup();
    render(<StudyPage />);

    await user.type(screen.getByPlaceholderText(/type the word/i), "  HELLO  ");
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/session complete/i)).toBeInTheDocument();
  });

  test("wrong answer reveals word, increments wrongCount on Next, requeues card", async () => {
    const [a, b] = seed([
      ["one", "the number 1"],
      ["two", "the number 2"],
    ]);
    const user = userEvent.setup();
    render(<StudyPage />);

    const input = screen.getByPlaceholderText(/type the word/i);
    await user.type(input, "wrong");
    await user.click(screen.getByRole("button", { name: /check/i }));

    // Reveal section
    expect(screen.getByText(/answer:/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    // The wrong card was requeued: total 2 cards, neither finished yet.
    expect(screen.queryByText(/session complete/i)).not.toBeInTheDocument();
    expect(screen.getByText(/0 \/ 2 reviewed/i)).toBeInTheDocument();

    // Whichever id had its wrongCount bumped is the one we got wrong.
    const wrongs = [a, b].filter((c) => (getCard(c.id)?.wrongCount ?? 0) > 0);
    expect(wrongs).toHaveLength(1);
  });

  test("session complete after all answered correctly; restart starts a new session", async () => {
    seed([
      ["one", "the number 1"],
      ["two", "the number 2"],
    ]);
    const user = userEvent.setup();
    render(<StudyPage />);

    for (let i = 0; i < 2; i++) {
      const def = screen.getByText(/the number/i).textContent ?? "";
      const word = def.includes("1") ? "one" : "two";
      await user.type(screen.getByPlaceholderText(/type the word/i), word);
      await user.click(screen.getByRole("button", { name: /check/i }));
    }

    expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    expect(screen.getByText(/2 cards reviewed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /study again/i }));
    expect(screen.getByPlaceholderText(/type the word/i)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 2 reviewed/i)).toBeInTheDocument();
  });

  test("progress bar reflects done/total", async () => {
    seed([
      ["one", "def 1"],
      ["two", "def 2"],
      ["three", "def 3"],
    ]);
    render(<StudyPage />);
    expect(screen.getByText(/0 \/ 3 reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/3 in queue/i)).toBeInTheDocument();
  });

  test("study session is initialized from a snapshot — adding cards later does not change the session", async () => {
    seed([["one", "def 1"]]);
    render(<StudyPage />);
    expect(screen.getByText(/0 \/ 1 reviewed/i)).toBeInTheDocument();

    await act(async () => {
      addCard({ word: "two", definition: "def 2" });
    });

    // Session total is still 1, even though storage now has 2 cards.
    expect(screen.getByText(/0 \/ 1 reviewed/i)).toBeInTheDocument();
    expect(loadCards()).toHaveLength(2);
  });
});
