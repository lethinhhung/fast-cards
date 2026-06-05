import { describe, expect, test } from "vitest";
import { matchesTagFilter, UNTAGGED } from "@/lib/tagFilter";

describe("matchesTagFilter", () => {
  test("empty filter matches everything", () => {
    expect(matchesTagFilter([], [])).toBe(true);
    expect(matchesTagFilter(["a"], [])).toBe(true);
  });

  test("requires every filter tag (AND)", () => {
    expect(matchesTagFilter(["a", "b"], ["a"])).toBe(true);
    expect(matchesTagFilter(["a", "b"], ["a", "b"])).toBe(true);
    expect(matchesTagFilter(["a"], ["a", "b"])).toBe(false);
  });

  test("UNTAGGED matches only cards with no tags", () => {
    expect(matchesTagFilter([], [UNTAGGED])).toBe(true);
    expect(matchesTagFilter(["a"], [UNTAGGED])).toBe(false);
  });
});
