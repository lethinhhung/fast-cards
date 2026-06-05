import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CardsPage from "@/app/cards/page";
import { addCard, addTag, getCard, loadCards, loadTags } from "@/lib/storage";

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

describe("CardsPage bulk tagging", () => {
  test("selecting cards shows the action bar; bulk-apply adds a tag to all", async () => {
    const verbs = addTag("verbs")!;
    const a = addCard({ word: "alpha", definition: "1" });
    const b = addCard({ word: "beta", definition: "2" });
    const c = addCard({ word: "gamma", definition: "3" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("checkbox", { name: /select alpha/i }));
    await user.click(screen.getByRole("checkbox", { name: /select beta/i }));
    expect(screen.getByText(/^2 selected$/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tags/i }));
    await user.click(
      await screen.findByRole("checkbox", { name: /tag verbs/i }),
    );
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(getCard(a.id)!.tags).toContain(verbs.id);
    expect(getCard(b.id)!.tags).toContain(verbs.id);
    expect(getCard(c.id)!.tags).toHaveLength(0);
  });

  test("partial tag is indeterminate; toggling to unchecked removes it from all", async () => {
    const verbs = addTag("verbs")!;
    const a = addCard({ word: "alpha", definition: "1", tags: [verbs.id] });
    const b = addCard({ word: "beta", definition: "2" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("checkbox", { name: /select alpha/i }));
    await user.click(screen.getByRole("checkbox", { name: /select beta/i }));
    await user.click(screen.getByRole("button", { name: /tags/i }));

    const tagBox = await screen.findByRole("checkbox", { name: /tag verbs/i });
    expect(tagBox).toHaveAttribute("data-state", "indeterminate");

    // indeterminate -> checked (add to all) -> unchecked (remove from all)
    await user.click(tagBox);
    expect(tagBox).toHaveAttribute("data-state", "checked");
    await user.click(tagBox);
    expect(tagBox).toHaveAttribute("data-state", "unchecked");
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(getCard(a.id)!.tags).toHaveLength(0);
    expect(getCard(b.id)!.tags).toHaveLength(0);
  });

  test("creating a new tag from the menu stages it and applies to selection", async () => {
    const a = addCard({ word: "alpha", definition: "1" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("checkbox", { name: /select alpha/i }));
    await user.click(screen.getByRole("button", { name: /tags/i }));
    await user.type(
      await screen.findByPlaceholderText(/search or create tag/i),
      "spanish",
    );
    await user.click(screen.getByRole("button", { name: /create .spanish./i }));
    await user.click(screen.getByRole("button", { name: /apply/i }));

    const tag = loadTags().find((t) => t.name === "spanish")!;
    expect(tag).toBeDefined();
    expect(getCard(a.id)!.tags).toEqual([tag.id]);
  });

  test("select all selects every filtered card; bulk delete removes them", async () => {
    addCard({ word: "alpha", definition: "1" });
    addCard({ word: "beta", definition: "2" });
    const keep = addCard({ word: "gamma", definition: "3" });
    const user = userEvent.setup();
    render(<CardsPage />);

    // Filter down to alpha/beta, then select all visible.
    await user.type(screen.getByPlaceholderText(/search/i), "et");
    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    expect(screen.getByText(/^1 selected$/)).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(/search/i));

    // Clearing the filter resets the selection (bulk acts only on visible cards).
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /select alpha/i }));
    await user.click(screen.getByRole("checkbox", { name: /select beta/i }));

    const bar = screen.getByText(/^2 selected$/).parentElement!;
    await user.click(within(bar).getByRole("button", { name: /^delete$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    expect(loadCards().map((c) => c.id)).toEqual([keep.id]);
  });

  test("Untagged filter shows only untagged cards; picking a tag clears it", async () => {
    const t = addTag("verbs")!;
    addCard({ word: "alpha", definition: "1", tags: [t.id] });
    addCard({ word: "beta", definition: "2" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: /^untagged$/i }));
    expect(screen.getByText("beta")).toBeInTheDocument();
    // Filtered-out rows animate out, so removal is async.
    await waitFor(() =>
      expect(screen.queryByText("alpha")).not.toBeInTheDocument(),
    );

    // Untagged is mutually exclusive with real tags.
    await user.click(screen.getByRole("button", { name: /^verbs$/i }));
    expect(screen.getByText("alpha")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("beta")).not.toBeInTheDocument(),
    );
  });

  test("bulk-tagging untagged cards drops them from filter and selection", async () => {
    const verbs = addTag("verbs")!;
    const a = addCard({ word: "alpha", definition: "1" });
    const b = addCard({ word: "beta", definition: "2" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: /^untagged$/i }));
    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /tags/i }));
    await user.click(
      await screen.findByRole("checkbox", { name: /tag verbs/i }),
    );
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(getCard(a.id)!.tags).toEqual([verbs.id]);
    expect(getCard(b.id)!.tags).toEqual([verbs.id]);
    // Both cards left the Untagged filter, so the selection bar is gone.
    expect(screen.queryByText(/^2 selected$/)).not.toBeInTheDocument();
    expect(screen.getByText(/no matches\./i)).toBeInTheDocument();
  });

  test("shift-click selects a range", async () => {
    addCard({ word: "gamma", definition: "3" });
    addCard({ word: "beta", definition: "2" });
    addCard({ word: "alpha", definition: "1" });
    const user = userEvent.setup();
    render(<CardsPage />);

    await user.click(screen.getByRole("checkbox", { name: /select alpha/i }));
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("checkbox", { name: /select gamma/i }));
    await user.keyboard("{/Shift}");

    expect(screen.getByText(/^3 selected$/)).toBeInTheDocument();
  });
});
