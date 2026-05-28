import { describe, expect, test, vi } from "vitest";
import { download, parseFile, toCSV, toJSON } from "@/lib/io";
import type { Flashcard } from "@/lib/types";

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: "id-1",
    word: "hello",
    definition: "greeting",
    tags: [],
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

  test("pretty-prints with 2-space indentation", () => {
    const out = toJSON([card({ word: "a", definition: "b" })]);
    // Array items get 2-space indent, their fields get 4-space.
    expect(out).toContain('[\n  {\n    "id":');
  });

  test("empty list yields '[]'", () => {
    expect(toJSON([])).toBe("[]");
  });
});

describe("toCSV", () => {
  const PREAMBLE = "﻿sep=,\r\n";

  test("emits Excel preamble + header + rows with CRLF", () => {
    const out = toCSV([card({ word: "a", definition: "b" })]);
    expect(out).toBe(
      PREAMBLE + "word,definition,tags,correctCount,wrongCount\r\na,b,,2,1",
    );
  });

  test("starts with UTF-8 BOM so Excel decodes UTF-8 correctly", () => {
    expect(toCSV([]).charCodeAt(0)).toBe(0xfeff);
  });

  test("quotes cells with comma, quote, or newline; escapes quotes by doubling", () => {
    const out = toCSV([
      card({ word: 'he said "hi"', definition: "a, b\nc" }),
    ]);
    expect(out).toBe(
      PREAMBLE +
        "word,definition,tags,correctCount,wrongCount\r\n" +
        '"he said ""hi""","a, b\nc",,2,1',
    );
  });

  test("empty list yields just preamble + header", () => {
    expect(toCSV([])).toBe(
      PREAMBLE + "word,definition,tags,correctCount,wrongCount",
    );
  });

  test("emits tag names when a lookup is provided", () => {
    const out = toCSV(
      [card({ tags: ["t1", "t2"] })],
      new Map([
        ["t1", { id: "t1", name: "spanish", createdAt: 0 }],
        ["t2", { id: "t2", name: "verbs", createdAt: 0 }],
      ]),
    );
    expect(out).toContain("spanish;verbs");
  });

  test("output round-trips back through parseFile", () => {
    const cards = [
      card({ word: "a", definition: "b" }),
      card({ id: "id-2", word: 'he said "hi"', definition: "x, y\nz" }),
    ];
    const parsed = parseFile("out.csv", toCSV(cards));
    expect(parsed).toHaveLength(2);
    expect(parsed[1].word).toBe('he said "hi"');
    expect(parsed[1].definition).toBe("x, y\nz");
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

  test("strips a leading UTF-8 BOM before the header", () => {
    const csv = "﻿word,definition\r\na,1";
    const [c] = parseFile("x.csv", csv);
    expect(c.word).toBe("a");
  });

  test("skips an Excel `sep=,` directive line", () => {
    const csv = "sep=,\r\nword,definition\r\na,1";
    const [c] = parseFile("x.csv", csv);
    expect(c.word).toBe("a");
  });

  test("strips BOM and sep= directive together (full Excel output shape)", () => {
    const csv = "﻿sep=,\r\nword,definition\r\na,1\r\nb,2";
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

describe("parseFile error cases", () => {
  test(".json extension with malformed text throws", () => {
    expect(() => parseFile("x.json", "{not json")).toThrow();
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

  test("passes filename and MIME through to the anchor and blob", () => {
    let capturedBlob: Blob | undefined;
    const createObj = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation((b: Blob | MediaSource) => {
        capturedBlob = b as Blob;
        return "blob:test";
      });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    let capturedAnchor: HTMLAnchorElement | undefined;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        capturedAnchor = this;
      });

    download("flashcards.csv", "a,b", "text/csv;charset=utf-8");

    expect(capturedAnchor?.download).toBe("flashcards.csv");
    expect(capturedAnchor?.href).toBe("blob:test");
    expect(capturedBlob?.type).toBe("text/csv;charset=utf-8");

    createObj.mockRestore();
    click.mockRestore();
  });

  test("removes the anchor from the DOM after clicking", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const before = document.body.querySelectorAll("a").length;
    download("x.json", "{}", "application/json");
    expect(document.body.querySelectorAll("a").length).toBe(before);
  });
});
