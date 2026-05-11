import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CardsPage from "@/app/cards/page";
import { addCard, loadCards } from "@/lib/storage";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CardsPage", () => {
  test("empty state when no cards; export and clear buttons disabled", () => {
    render(<CardsPage />);
    expect(screen.getByText(/no cards yet\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear all/i })).toBeDisabled();
  });

  test("renders all cards with stats", () => {
    addCard({ word: "alpha", definition: "first letter" });
    addCard({ word: "beta", definition: "second letter" });
    render(<CardsPage />);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getAllByText(/✓ 0/)).toHaveLength(2);
  });

  test("search filters by word and definition (case-insensitive)", async () => {
    addCard({ word: "alpha", definition: "first letter" });
    addCard({ word: "beta", definition: "second letter" });
    addCard({ word: "gamma", definition: "third letter" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.type(screen.getByPlaceholderText(/search/i), "BET");
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("gamma")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search/i));
    await user.type(screen.getByPlaceholderText(/search/i), "third");
    expect(screen.getByText("gamma")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search/i));
    await user.type(screen.getByPlaceholderText(/search/i), "zzz");
    expect(screen.getByText(/no matches\./i)).toBeInTheDocument();
  });

  test("delete dialog removes a card after confirmation", async () => {
    addCard({ word: "alpha", definition: "1" });
    addCard({ word: "beta", definition: "2" });
    const user = userEvent.setup();
    render(<CardsPage />);

    const alphaRow = screen.getByText("alpha").closest("li")!;
    await user.click(within(alphaRow).getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/delete card\?/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    expect(loadCards().map((c) => c.word)).toEqual(["beta"]);
  });

  test("delete dialog cancel keeps the card", async () => {
    addCard({ word: "alpha", definition: "1" });
    const user = userEvent.setup();
    render(<CardsPage />);

    const row = screen.getByText("alpha").closest("li")!;
    await user.click(within(row).getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(loadCards()).toHaveLength(1);
  });

  test("clear all removes every card after confirmation", async () => {
    addCard({ word: "alpha", definition: "1" });
    addCard({ word: "beta", definition: "2" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(/delete all cards\?/i),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /delete all/i }),
    );

    expect(loadCards()).toHaveLength(0);
  });

  test("import merge prepends incoming cards to existing", async () => {
    addCard({ word: "existing", definition: "old" });
    const user = userEvent.setup();
    render(<CardsPage />);

    const file = new File(
      [JSON.stringify([{ word: "imported", definition: "new" }])],
      "in.json",
      { type: "application/json" },
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/import 1 cards/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /merge/i }));

    expect(loadCards().map((c) => c.word)).toEqual(["imported", "existing"]);
  });

  test("import replace overwrites after second confirmation", async () => {
    addCard({ word: "old", definition: "old" });
    const user = userEvent.setup();
    render(<CardsPage />);

    const file = new File(
      [
        JSON.stringify([
          { word: "a", definition: "1" },
          { word: "b", definition: "2" },
        ]),
      ],
      "in.json",
      { type: "application/json" },
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    // First dialog: pick Replace
    let dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /replace/i }));

    // Second dialog: confirm replace
    dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(/replace all cards\?/i),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /replace/i }));

    expect(loadCards().map((c) => c.word).sort()).toEqual(["a", "b"]);
  });

  test("import with no valid cards alerts and does nothing", async () => {
    addCard({ word: "keep", definition: "me" });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<CardsPage />);

    const file = new File([JSON.stringify([{ junk: true }])], "in.json");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringMatching(/no valid cards/i),
    );
    expect(loadCards().map((c) => c.word)).toEqual(["keep"]);
  });

  test("export JSON triggers a download with current cards", async () => {
    addCard({ word: "alpha", definition: "1" });
    const createObj = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: /export json/i }));
    expect(createObj).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  test("export CSV triggers a download", async () => {
    addCard({ word: "alpha", definition: "1" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(click).toHaveBeenCalled();
  });
});
