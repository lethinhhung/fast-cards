import type { Flashcard } from "./types";
import { normalizeImported } from "./storage";

export function toJSON(cards: Flashcard[]): string {
  return JSON.stringify(cards, null, 2);
}

export function toCSV(cards: Flashcard[]): string {
  const header = "word,definition,correctCount,wrongCount";
  const rows = cards.map((c) =>
    [c.word, c.definition, c.correctCount, c.wrongCount].map(csvCell).join(","),
  );
  return [header, ...rows].join("\n");
}

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function parseFile(name: string, text: string): Flashcard[] {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "json") return parseJSON(text);
  if (ext === "csv") return parseCSV(text);
  // Try JSON first, fall back to CSV
  try {
    return parseJSON(text);
  } catch {
    return parseCSV(text);
  }
}

function parseJSON(text: string): Flashcard[] {
  const data = JSON.parse(text);
  return normalizeImported(data);
}

function parseCSV(text: string): Flashcard[] {
  const rows = splitCSVRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const wi = header.indexOf("word");
  const di = header.indexOf("definition");
  if (wi === -1 || di === -1) return [];
  const ci = header.indexOf("correctcount");
  const xi = header.indexOf("wrongcount");
  return normalizeImported(
    rows.slice(1).map((r) => ({
      word: r[wi],
      definition: r[di],
      correctCount: ci !== -1 ? Number(r[ci]) : 0,
      wrongCount: xi !== -1 ? Number(r[xi]) : 0,
    })),
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
