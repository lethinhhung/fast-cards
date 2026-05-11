import { describe, expect, test, vi } from "vitest";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";
import type { Flashcard } from "@/lib/types";

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: "id-1",
    word: "hello",
    definition: "greeting",
    correctCount: 2,
    wrongCount: 1,
    createdAt: 100,
    lastReviewedAt: null,
    ...overrides,
  };
}

describe("toJSON", () => {
  test("round-trips through JSON.parse", () => {
    const cards = [card(), card({ id: "id-2", word: "bye" })];
    expect(JSON.parse(toJSON(cards))).toEqual(cards);
  });
});

describe("toCSV", () => {
  test("emits header + rows", () => {
    const out = toCSV([card({ word: "a", definition: "b" })]);
    expect(out).toBe("word,definition,correctCount,wrongCount\na,b,2,1");
  });

  test("quotes cells with comma, quote, or newline; escapes quotes by doubling", () => {
    const out = toCSV([
      card({ word: 'he said "hi"', definition: "a, b\nc" }),
    ]);
    expect(out).toBe(
      'word,definition,correctCount,wrongCount\n' +
        '"he said ""hi""","a, b\nc",2,1',
    );
  });

  test("empty list yields just the header", () => {
    expect(toCSV([])).toBe("word,definition,correctCount,wrongCount");
  });
});

describe("parseFile JSON", () => {
  test("reads valid JSON file", () => {
    const text = JSON.stringify([{ word: "a", definition: "x" }]);
    const out = parseFile("any.json", text);
    expect(out).toHaveLength(1);
    expect(out[0].word).toBe("a");
  });

  test("drops invalid rows from JSON", () => {
    const text = JSON.stringify([
      { word: "a", definition: "x" },
      { word: "", definition: "x" },
      { junk: true },
    ]);
    expect(parseFile("x.json", text)).toHaveLength(1);
  });
});

describe("parseFile CSV", () => {
  test("reads basic CSV", () => {
    const csv = "word,definition,correctCount,wrongCount\nhello,greeting,2,1";
    const [c] = parseFile("x.csv", csv);
    expect(c.word).toBe("hello");
    expect(c.definition).toBe("greeting");
    expect(c.correctCount).toBe(2);
    expect(c.wrongCount).toBe(1);
  });

  test("handles quoted fields with commas, newlines, and escaped quotes", () => {
    const csv =
      'word,definition\n' +
      '"a, b","line1\nline2"\n' +
      '"he said ""hi""","ok"';
    const cards = parseFile("x.csv", csv);
    expect(cards).toHaveLength(2);
    expect(cards[0].word).toBe("a, b");
    expect(cards[0].definition).toBe("line1\nline2");
    expect(cards[1].word).toBe('he said "hi"');
  });

  test("tolerates header in any case and missing optional columns", () => {
    const csv = "WORD,Definition\nhi,there";
    const [c] = parseFile("x.csv", csv);
    expect(c.word).toBe("hi");
    expect(c.correctCount).toBe(0);
    expect(c.wrongCount).toBe(0);
  });

  test("returns [] when required columns missing", () => {
    expect(parseFile("x.csv", "foo,bar\n1,2")).toEqual([]);
  });

  test("ignores blank rows", () => {
    const csv = "word,definition\n\na,1\n\n";
    expect(parseFile("x.csv", csv)).toHaveLength(1);
  });

  test("handles CRLF line endings", () => {
    const csv = "word,definition\r\na,1\r\nb,2";
    expect(parseFile("x.csv", csv)).toHaveLength(2);
  });
});

describe("parseFile unknown extension", () => {
  test("falls back to JSON, then CSV", () => {
    const json = JSON.stringify([{ word: "a", definition: "1" }]);
    expect(parseFile("file.txt", json)).toHaveLength(1);

    const csv = "word,definition\na,1";
    expect(parseFile("file.txt", csv)).toHaveLength(1);
  });
});

describe("download", () => {
  test("creates an anchor with object URL and clicks it", () => {
    const createObj = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObj = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");

    download("out.json", "{}", "application/json");

    expect(createObj).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObj).toHaveBeenCalledWith("blob:test");

    createObj.mockRestore();
    revokeObj.mockRestore();
    click.mockRestore();
  });
});
