import { lookupDictionaryDefinition } from "./answer-context";
import { answerWords } from "./answer-format";
import { getStoredHomophoneDefinition } from "./db/homophones";
import {
  hintsFromDefinition,
  isSubstitutableHomophoneHint,
} from "./homophone-definitions";
import { getCachedFullDefinition } from "./homophone-meaning";
import { getCuratedHomophoneHints } from "./homophone-synonyms";

const MAX_SYNONYMS_PER_WORD = 24;

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function isUsableSynonym(
  synonym: string,
  word: string,
  sourceText?: string
): boolean {
  if (!isSubstitutableHomophoneHint(synonym, word, sourceText)) return false;
  const wordCount = synonym
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount > 4) return false;
  return true;
}

function capitalizeSynonym(synonym: string): string {
  const trimmed = synonym.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function addSynonym(
  synonyms: string[],
  seen: Set<string>,
  candidate: string,
  word: string,
  sourceText?: string
): void {
  if (!isUsableSynonym(candidate, word, sourceText)) return;
  const capitalized = capitalizeSynonym(candidate);
  const key = capitalized.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  synonyms.push(capitalized);
}

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string }[];
}

interface DictionaryApiEntry {
  meanings?: DictionaryApiMeaning[];
}

/** Fetch all definition clauses from the free dictionary API for hint extraction. */
async function lookupDictionaryDefinitionClauses(
  word: string
): Promise<string[]> {
  const normalized = normalizeWord(word);
  if (!normalized) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return [];

    const entries = (await res.json()) as DictionaryApiEntry[];
    const clauses: string[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          const text = def.definition?.trim();
          if (!text) continue;
          const key = text.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          clauses.push(text);
        }
      }
    }

    return clauses;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function definitionSourcesForWord(word: string): string[] {
  const lookupWord = answerWords(word)[0] ?? word;
  const definitions: string[] = [];
  const seen = new Set<string>();

  function addDefinition(text: string | undefined): void {
    const trimmed = text?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    definitions.push(trimmed);
  }

  addDefinition(getStoredHomophoneDefinition(lookupWord)?.definition);
  addDefinition(getCachedFullDefinition(lookupWord)?.definition);

  return definitions;
}

/** Gather as many quality synonym/hint phrases as possible for a homophone word. */
export async function gatherHomophoneSynonyms(word: string): Promise<string[]> {
  const lookupWord = answerWords(word)[0] ?? word;
  const synonyms: string[] = [];
  const seen = new Set<string>();

  for (const hint of getCuratedHomophoneHints(lookupWord)) {
    addSynonym(synonyms, seen, hint, lookupWord);
  }

  for (const definition of definitionSourcesForWord(lookupWord)) {
    for (const hint of hintsFromDefinition(definition, lookupWord)) {
      addSynonym(synonyms, seen, hint, lookupWord, definition);
    }
  }

  if (synonyms.length < 8) {
    const dict = await lookupDictionaryDefinition(lookupWord);
    if (dict?.definition) {
      for (const hint of hintsFromDefinition(dict.definition, lookupWord)) {
        addSynonym(synonyms, seen, hint, lookupWord, dict.definition);
      }
    }
  }

  if (synonyms.length < 12) {
    const clauses = await lookupDictionaryDefinitionClauses(lookupWord);
    for (const clause of clauses) {
      for (const hint of hintsFromDefinition(clause, lookupWord)) {
        addSynonym(synonyms, seen, hint, lookupWord, clause);
      }
    }
  }

  return synonyms.slice(0, MAX_SYNONYMS_PER_WORD);
}

/** Synchronous synonym gather using only local/DB sources (no network). */
export function gatherHomophoneSynonymsLocal(word: string): string[] {
  const lookupWord = answerWords(word)[0] ?? word;
  const synonyms: string[] = [];
  const seen = new Set<string>();

  for (const hint of getCuratedHomophoneHints(lookupWord)) {
    addSynonym(synonyms, seen, hint, lookupWord);
  }

  for (const definition of definitionSourcesForWord(lookupWord)) {
    for (const hint of hintsFromDefinition(definition, lookupWord)) {
      addSynonym(synonyms, seen, hint, lookupWord, definition);
    }
  }

  return synonyms.slice(0, MAX_SYNONYMS_PER_WORD);
}
