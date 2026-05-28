import type { Flashcard, Tag } from "./types";
import { normalizeImported } from "./storage";

type TagLookup = ReadonlyMap<string, Tag> | Map<string, Tag>;

function tagNamesFor(card: Flashcard, lookup?: TagLookup): string[] {
  if (!lookup) return [];
  const names: string[] = [];
  for (const id of card.tags) {
    const tag = lookup.get(id);
    if (tag) names.push(tag.name);
  }
  return names;
}

export function toJSON(cards: Flashcard[], tags?: TagLookup): string {
  const out = cards.map((c) => ({
    ...c,
    tags: tagNamesFor(c, tags),
  }));
  return JSON.stringify(out, null, 2);
}

// UTF-8 BOM + an Excel `sep=,` directive so Excel respects the comma
// separator regardless of the user's regional list-separator setting.
const CSV_PREAMBLE = "﻿sep=,\r\n";

export function toCSV(cards: Flashcard[], tags?: TagLookup): string {
  const header = "word,definition,tags,correctCount,wrongCount";
  const rows = cards.map((c) =>
    [
      c.word,
      c.definition,
      tagNamesFor(c, tags).join(";"),
      c.correctCount,
      c.wrongCount,
    ]
      .map(csvCell)
      .join(","),
  );
  return CSV_PREAMBLE + [header, ...rows].join("\r\n");
}

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function parseFile(
  name: string,
  text: string,
  resolveTag?: (name: string) => string,
): Flashcard[] {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "json") return parseJSON(text, resolveTag);
  if (ext === "csv") return parseCSV(text, resolveTag);
  // Try JSON first, fall back to CSV
  try {
    return parseJSON(text, resolveTag);
  } catch {
    return parseCSV(text, resolveTag);
  }
}

function parseJSON(
  text: string,
  resolveTag?: (name: string) => string,
): Flashcard[] {
  const data = JSON.parse(text);
  return normalizeImported(data, resolveTag);
}

function parseCSV(
  text: string,
  resolveTag?: (name: string) => string,
): Flashcard[] {
  // Strip a leading UTF-8 BOM and an optional Excel `sep=` directive row.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (/^sep=.\r?\n/i.test(text)) text = text.replace(/^sep=.\r?\n/i, "");
  const rows = splitCSVRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const wi = header.indexOf("word");
  const di = header.indexOf("definition");
  if (wi === -1 || di === -1) return [];
  const ci = header.indexOf("correctcount");
  const xi = header.indexOf("wrongcount");
  const ti = header.indexOf("tags");
  return normalizeImported(
    rows.slice(1).map((r) => ({
      word: r[wi],
      definition: r[di],
      tags:
        ti !== -1 && typeof r[ti] === "string"
          ? r[ti]
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      correctCount: ci !== -1 ? Number(r[ci]) : 0,
      wrongCount: xi !== -1 ? Number(r[xi]) : 0,
    })),
    resolveTag,
  );
}

function splitCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
