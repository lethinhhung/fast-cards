import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import EditCardPage from "@/app/cards/[id]/page";
import { addCard, loadCards } from "@/lib/storage";

// React 19's `use(promise)` reads `.status`/`.value` to skip suspending on an
// already-resolved promise. jsdom never schedules the resolution callback, so
// we pre-populate these fields to keep the test render synchronous.
function resolvedParams<T extends object>(value: T): Promise<T> {
  const p = Promise.resolve(value) as Promise<T> & {
    status?: string;
    value?: T;
  };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

function renderEdit(id: string) {
  return render(<EditCardPage params={resolvedParams({ id })} />);
}

beforeEach(() => {
  push.mockClear();
});

describe("EditCardPage", () => {
  test("shows Not found for unknown id", async () => {
    renderEdit("nope");
    expect(await screen.findByText(/card not found/i)).toBeInTheDocument();
  });

  test("loads existing card values into the form", async () => {
    const c = addCard({ word: "hello", definition: "greeting" });
    renderEdit(c.id);
    expect(await screen.findByDisplayValue("hello")).toBeInTheDocument();
    expect(screen.getByDisplayValue("greeting")).toBeInTheDocument();
  });

  test("Save persists trimmed values and navigates to /cards", async () => {
    const c = addCard({ word: "hello", definition: "greeting" });
    const user = userEvent.setup();
    renderEdit(c.id);

    const wordInput = await screen.findByLabelText(/word/i);
    await user.clear(wordInput);
    await user.type(wordInput, "  bonjour  ");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(loadCards()[0].word).toBe("bonjour");
    expect(loadCards()[0].definition).toBe("greeting");
    expect(push).toHaveBeenCalledWith("/cards");
  });

  test("Save disabled when either field is empty", async () => {
    const c = addCard({ word: "hello", definition: "greeting" });
    const user = userEvent.setup();
    renderEdit(c.id);

    const wordInput = await screen.findByLabelText(/word/i);
    await user.clear(wordInput);
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  test("Cancel navigates without saving", async () => {
    const c = addCard({ word: "hello", definition: "greeting" });
    const user = userEvent.setup();
    renderEdit(c.id);

    const wordInput = await screen.findByLabelText(/word/i);
    await user.clear(wordInput);
    await user.type(wordInput, "changed");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(loadCards()[0].word).toBe("hello");
    expect(push).toHaveBeenCalledWith("/cards");
  });

  test("Delete opens dialog and confirming removes the card", async () => {
    const c = addCard({ word: "hello", definition: "greeting" });
    const user = userEvent.setup();
    renderEdit(c.id);

    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    // Dialog is now open — its action button is the second "Delete".
    const confirm = await screen.findByRole("button", { name: /^delete$/i });
    await user.click(confirm);

    expect(loadCards()).toHaveLength(0);
    expect(push).toHaveBeenCalledWith("/cards");
  });
});
