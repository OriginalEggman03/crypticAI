import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AnagramDifficulty } from "@/lib/types";

export interface ArchivedClue {
  id: number;
  inspiration: string;
  difficulty: AnagramDifficulty;
  answer: string;
  clue: string;
  anagramFodder: string;
  anagramIndicator: string | null;
  rating: number;
  createdAt: string;
}

export interface ArchiveClueInput {
  inspiration: string;
  difficulty: AnagramDifficulty;
  answer: string;
  clue: string;
  anagramFodder: string;
  anagramIndicator?: string;
  rating: number;
}

export interface ArchiveSearchQuery {
  inspiration?: string;
  difficulty?: AnagramDifficulty;
  /** Exact star rating (1–5). */
  rating?: number;
  /** Minimum star rating inclusive (1–5). */
  minRating?: number;
  /** Maximum star rating inclusive (1–5). */
  maxRating?: number;
  limit?: number;
}

let db: DatabaseSync | null = null;

function databasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
}

function getDb(): DatabaseSync {
  if (db) return db;

  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_clues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspiration TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'hard')),
      answer TEXT NOT NULL,
      clue TEXT NOT NULL,
      anagram_fodder TEXT NOT NULL,
      anagram_indicator TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_archived_inspiration ON archived_clues(inspiration);
    CREATE INDEX IF NOT EXISTS idx_archived_rating ON archived_clues(rating);
    CREATE INDEX IF NOT EXISTS idx_archived_difficulty ON archived_clues(difficulty);
    CREATE INDEX IF NOT EXISTS idx_archived_created ON archived_clues(created_at DESC);
  `);

  return db;
}

function rowToArchived(row: Record<string, unknown>): ArchivedClue {
  return {
    id: Number(row.id),
    inspiration: row.inspiration as string,
    difficulty: row.difficulty as AnagramDifficulty,
    answer: row.answer as string,
    clue: row.clue as string,
    anagramFodder: row.anagram_fodder as string,
    anagramIndicator: (row.anagram_indicator as string | null) ?? null,
    rating: Number(row.rating),
    createdAt: row.created_at as string,
  };
}

export function normalizeInspirationKey(inspiration: string): string {
  return inspiration.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Distinct inspiration phrases already stored in the archive. */
export function listArchivedInspirations(): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT inspiration FROM archived_clues ORDER BY inspiration COLLATE NOCASE`
    )
    .all() as { inspiration: string }[];

  return rows.map((r) => r.inspiration.trim()).filter(Boolean);
}

/** Most recently archived distinct inspiration phrases. */
export function listRecentInspirations(limit = 3): string[] {
  const capped = Math.min(Math.max(limit, 1), 20);
  const rows = getDb()
    .prepare(
      `SELECT inspiration
       FROM archived_clues
       GROUP BY inspiration COLLATE NOCASE
       ORDER BY MAX(created_at) DESC
       LIMIT ?`
    )
    .all(capped) as { inspiration: string }[];

  return rows.map((r) => r.inspiration.trim()).filter(Boolean);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/** Distinct inspirations whose text starts with prefix (case-insensitive). */
export function listInspirationPrefixMatches(
  prefix: string,
  limit = 10
): string[] {
  const trimmed = prefix.trim();
  if (!trimmed) return [];

  const capped = Math.min(Math.max(limit, 1), 50);
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT inspiration
       FROM archived_clues
       WHERE inspiration LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY inspiration COLLATE NOCASE
       LIMIT ?`
    )
    .all(`${escapeLikePattern(trimmed)}%`, capped) as { inspiration: string }[];

  return rows.map((r) => r.inspiration.trim()).filter(Boolean);
}

export function archivedInspirationKeys(): Set<string> {
  return new Set(listArchivedInspirations().map(normalizeInspirationKey));
}

export function isInspirationArchived(inspiration: string): boolean {
  const key = normalizeInspirationKey(inspiration);
  if (!key) return false;
  return archivedInspirationKeys().has(key);
}

export function validateRating(rating: unknown): rating is number {
  return typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function archiveClue(input: ArchiveClueInput): ArchivedClue {
  if (!validateRating(input.rating)) {
    throw new Error("Rating must be an integer from 1 to 5");
  }

  const inspiration = input.inspiration.trim();
  const clue = input.clue.trim();
  const answer = input.answer.trim();
  const anagramFodder = input.anagramFodder.trim();

  if (!inspiration || !clue || !answer || !anagramFodder) {
    throw new Error("Inspiration, clue, answer, and anagram fodder are required");
  }

  if (input.difficulty !== "easy" && input.difficulty !== "hard") {
    throw new Error("Difficulty must be easy or hard");
  }

  const database = getDb();
  const insert = database.prepare(`
    INSERT INTO archived_clues (
      inspiration, difficulty, answer, clue, anagram_fodder, anagram_indicator, rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    inspiration,
    input.difficulty,
    answer.toUpperCase(),
    clue,
    anagramFodder.toLowerCase(),
    input.anagramIndicator?.trim() || null,
    input.rating
  );

  const row = database
    .prepare("SELECT * FROM archived_clues WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as Record<string, unknown>;

  return rowToArchived(row);
}

export function searchArchivedClues(query: ArchiveSearchQuery = {}): ArchivedClue[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const inspiration = query.inspiration?.trim();
  if (inspiration) {
    conditions.push("inspiration LIKE ? ESCAPE '\\'");
    params.push(`%${inspiration.replace(/[%_\\]/g, "\\$&")}%`);
  }

  if (query.difficulty === "easy" || query.difficulty === "hard") {
    conditions.push("difficulty = ?");
    params.push(query.difficulty);
  }

  if (query.rating !== undefined) {
    if (!validateRating(query.rating)) {
      throw new Error("Rating filter must be an integer from 1 to 5");
    }
    conditions.push("rating = ?");
    params.push(query.rating);
  } else {
    if (query.minRating !== undefined) {
      if (!validateRating(query.minRating)) {
        throw new Error("minRating must be an integer from 1 to 5");
      }
      conditions.push("rating >= ?");
      params.push(query.minRating);
    }
    if (query.maxRating !== undefined) {
      if (!validateRating(query.maxRating)) {
        throw new Error("maxRating must be an integer from 1 to 5");
      }
      conditions.push("rating <= ?");
      params.push(query.maxRating);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

  const rows = getDb()
    .prepare(
      `SELECT * FROM archived_clues ${where} ORDER BY created_at DESC, id DESC LIMIT ?`
    )
    .all(...params, limit) as Record<string, unknown>[];

  return rows.map(rowToArchived);
}
