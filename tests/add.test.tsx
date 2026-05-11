import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import AddPage from "@/app/add/page";
import { loadCards } from "@/lib/storage";

beforeEach(() => {
  push.mockClear();
});

describe("AddPage", () => {
  test("save buttons disabled until both fields filled", async () => {
    const user = userEvent.setup();
    render(<AddPage />);

    const save = screen.getByRole("button", { name: /^save$/i });
    const saveMore = screen.getByRole("button", { name: /save & add another/i });
    expect(save).toBeDisabled();
    expect(saveMore).toBeDisabled();

    await user.type(screen.getByLabelText(/word/i), "hello");
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/definition/i), "greeting");
    expect(save).toBeEnabled();
    expect(saveMore).toBeEnabled();
  });

  test("Save persists card and navigates to /cards", async () => {
    const user = userEvent.setup();
    render(<AddPage />);

    await user.type(screen.getByLabelText(/word/i), "hello");
    await user.type(screen.getByLabelText(/definition/i), "greeting");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(loadCards()).toHaveLength(1);
    expect(loadCards()[0].word).toBe("hello");
    expect(push).toHaveBeenCalledWith("/cards");
  });

  test("Save & add another resets fields, bumps counter, stays on page", async () => {
    const user = userEvent.setup();
    render(<AddPage />);

    await user.type(screen.getByLabelText(/word/i), "one");
    await user.type(screen.getByLabelText(/definition/i), "1");
    await user.click(screen.getByRole("button", { name: /save & add another/i }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/word/i)).toHaveValue("");
    expect(screen.getByLabelText(/definition/i)).toHaveValue("");
    expect(screen.getByText(/saved 1 card this session/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/word/i), "two");
    await user.type(screen.getByLabelText(/definition/i), "2");
    await user.click(screen.getByRole("button", { name: /save & add another/i }));

    expect(loadCards()).toHaveLength(2);
    expect(screen.getByText(/saved 2 cards this session/i)).toBeInTheDocument();
  });

  test("whitespace-only fields don't enable save", async () => {
    const user = userEvent.setup();
    render(<AddPage />);
    await user.type(screen.getByLabelText(/word/i), "   ");
    await user.type(screen.getByLabelText(/definition/i), "   ");
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });
});
