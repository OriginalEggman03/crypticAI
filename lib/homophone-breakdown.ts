import { lookupDictionaryDefinition } from "./answer-context";
import { answerWords } from "./answer-format";
import { getStoredHomophoneDefinition } from "./db/homophones";
import { getCuratedHomophoneHints } from "./homophone-synonyms";
import type {
  AnagramClueDraft,
  HomophoneBreakdown,
  HomophoneSideBreakdown,
} from "./types";

function formatNoEntryFallback(word: string, surfaceHint: string): string {
  const key = word.toUpperCase();
  const curated = getCuratedHomophoneHints(word);
  const curatedNote =
    curated.length > 0
      ? ` Curated crossword sense for “${surfaceHint}”: ${curated.slice(0, 4).join(", ")}.`
      : "";

  if (word.length <= 4) {
    return `${key} has no standard dictionary headword — often an abbreviation in crosswords.${curatedNote}`;
  }

  return `No dictionary entry found for ${key}; the surface hint “${surfaceHint}” stands in for the spoken word.${curatedNote}`;
}

async function lookupSide(
  word: string,
  surfaceHint: string
): Promise<Omit<HomophoneSideBreakdown, "word" | "surfaceHint">> {
  const lookupWord = answerWords(word)[0] ?? word;
  const stored = getStoredHomophoneDefinition(lookupWord);
  const dict = stored ?? (await lookupDictionaryDefinition(lookupWord));

  if (dict?.definition) {
    return {
      dictionaryDefinition: dict.definition,
      partOfSpeech: dict.partOfSpeech,
      hasDictionaryEntry: true,
    };
  }

  return {
    dictionaryDefinition: formatNoEntryFallback(lookupWord, surfaceHint),
    hasDictionaryEntry: false,
  };
}

/** Build dictionary-backed breakdown for a verified homophone clue. */
export async function buildHomophoneBreakdown(
  clue: AnagramClueDraft
): Promise<HomophoneBreakdown> {
  const answerHint = clue.definition?.trim() || "—";
  const fodderHint = clue.homophoneHint?.trim() || "—";
  const indicator = clue.anagramIndicator?.trim() || "—";

  const [answerLookup, fodderLookup] = await Promise.all([
    lookupSide(clue.answer, answerHint),
    lookupSide(clue.anagramFodder, fodderHint),
  ]);

  return {
    definition: {
      word: clue.answer,
      surfaceHint: answerHint,
      ...answerLookup,
    },
    homophone: {
      word: clue.anagramFodder,
      surfaceHint: fodderHint,
      indicator,
      ...fodderLookup,
    },
  };
}
