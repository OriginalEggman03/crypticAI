import { answerLetterCount as countAnswerLetters, normalizeAnswer } from "./answer-format";
import {
  applyFodderCasingInClue,
  applyPlaceCasingInClue,
  formatFodderForClue,
  normalizeClueCapitalization,
  verifyClueCapitalizationRules,
} from "./proper-noun-casing";
import { isGrammaticalDictionaryFodder, isDictionaryFodder, fodderProperNameIssue } from "./fodder-quality";
import {
  restoreContractionsInClue,
  verifyClueContractionSpelling,
} from "./fodder-contractions";
import { verifyAnswerThematicLink } from "./theme-link-quality";
import { trivialFodderReason } from "./anagram-mix";
import {
  MAX_LINKING_WORDS,
  verifyLinkingWordCount,
} from "./clue-surface-link";
import { verifyNoSuperfluousWords } from "./clue-surface-tightness";
import { verifyNoTelegraphingPunctuation } from "./clue-surface-misdirection";
import {
  anagramMismatchReason,
  fixEnumerationInClue,
  hasAnagramIndicator,
  phraseAppearsAsFodderInClue,
  verifyAnswerNotStandalone,
  verifyAnagram,
  verifyEnumeration,
  verifyInspirationWordsNotInClue,
} from "./clue-verify";
import { verifyDefinitionNotVague } from "./definition-quality";
import { extractDefinitionPhrase } from "./clue-surface-link";
import type { AnagramClueDraft, AnagramVerification } from "./types";

function normalizeDraft(raw: AnagramClueDraft): AnagramClueDraft {
  return {
    answer: normalizeAnswer(raw.answer ?? ""),
    clue: raw.clue?.trim() ?? "",
    anagramFodder: raw.anagramFodder?.trim() ?? "",
    definition: raw.definition?.trim(),
    anagramIndicator: raw.anagramIndicator?.trim(),
  };
}

/** Fix enumeration, fodder capitals, place names, and proper-name casing in the clue surface. */
export function prepareAnagramClue(draft: AnagramClueDraft): AnagramClueDraft {
  const d = normalizeDraft(draft);
  const displayFodder = formatFodderForClue(d.anagramFodder);
  let clue = applyFodderCasingInClue(d.clue, d.anagramFodder);
  clue = applyPlaceCasingInClue(clue);
  clue = restoreContractionsInClue(clue);
  clue = normalizeClueCapitalization(clue);
  clue = fixEnumerationInClue(clue, d.answer);
  return {
    ...d,
    anagramFodder: displayFodder,
    clue,
  };
}

export interface AnagramVerifyOptions {
  inspiration?: string;
  /** Theme answers Claude suggested — counted when scoring the inspiration link. */
  suggestedAnswers?: string[];
  /** Lower bar for fallback passes when themed retries exhaust strong pairs. */
  minThemeScore?: number;
}

export function verifyAnagramClue(
  draft: AnagramClueDraft,
  options: AnagramVerifyOptions = {}
): AnagramVerification {
  const prepared = prepareAnagramClue(draft);
  const errors: string[] = [];
  const checks: AnagramVerification["checks"] = [];

  const add = (name: string, pass: boolean, detail: string) => {
    checks.push({ name, pass, detail });
    if (!pass) errors.push(detail);
  };

  if (!prepared.answer) {
    add("answer", false, "Answer is missing or empty");
    return { ok: false, errors, checks, prepared };
  }

  if (!prepared.clue) {
    add("clue", false, "Clue is missing or empty");
    return { ok: false, errors, checks, prepared };
  }

  if (!prepared.anagramFodder) {
    add("anagramFodder", false, "anagramFodder is required");
  }

  const enumErr = verifyEnumeration(prepared.clue, prepared.answer);
  add(
    "enumeration",
    !enumErr,
    enumErr ??
      `Enumeration matches answer (${countAnswerLetters(prepared.answer)} letters)`
  );

  const standalone = verifyAnswerNotStandalone(
    prepared.clue,
    prepared.answer,
    false
  );
  add(
    "no standalone answer",
    !standalone,
    standalone ?? "Answer does not appear as a standalone word"
  );

  const hasIndicator = hasAnagramIndicator(prepared.clue);
  add(
    "anagram indicator",
    hasIndicator,
    hasIndicator
      ? "Clue contains a fair anagram indicator"
      : "Clue lacks an anagram indicator (e.g. broken, muddled, strange)"
  );

  if (options.inspiration?.trim()) {
    const inspirationErr = verifyInspirationWordsNotInClue(
      prepared.clue,
      options.inspiration
    );
    add(
      "no inspiration words",
      !inspirationErr,
      inspirationErr ??
        "Clue does not repeat words from the inspiration phrase"
    );

    const themeLinkErr = verifyAnswerThematicLink(
      prepared.answer,
      options.inspiration,
      {
        suggestedAnswers: options.suggestedAnswers,
        minScore: options.minThemeScore,
      }
    );
    add(
      "theme link",
      !themeLinkErr,
      themeLinkErr ?? "Answer is linked to the inspiration theme"
    );
  }

  if (prepared.anagramFodder) {
    const dictFodder = isDictionaryFodder(prepared.anagramFodder);
    add(
      "fodder dictionary",
      dictFodder,
      dictFodder
        ? "Every fodder word is in the dictionary"
        : "Anagram fodder must use dictionary words only"
    );

    const grammatical = isGrammaticalDictionaryFodder(prepared.anagramFodder);
    add(
      "fodder readability",
      grammatical,
      grammatical
        ? "Fodder reads naturally as consecutive words in a clue"
        : "Anagram fodder does not read grammatically in a clue surface"
    );

    const properNameErr = fodderProperNameIssue(
      prepared.anagramFodder.toLowerCase(),
      prepared.anagramFodder,
      prepared.clue
    );
    add(
      "fodder proper names",
      !properNameErr,
      properNameErr ??
        "Fodder uses ordinary words or famous capitalised names and places only"
    );

    const capErr = verifyClueCapitalizationRules(prepared.clue);
    add(
      "capitalisation",
      !capErr,
      capErr ??
        "Sentence starts and names/places capitalised; all other words lowercase"
    );

    const definitionPhrase = extractDefinitionPhrase(
      prepared.clue,
      prepared.anagramFodder,
      prepared.anagramIndicator
    );
    const definitionErr = verifyDefinitionNotVague(definitionPhrase);
    add(
      "definition theme",
      !definitionErr,
      definitionErr ?? "Definition is specific to the inspiration's domain"
    );

    const superfluousErr = verifyNoSuperfluousWords(
      prepared.clue,
      prepared.anagramFodder,
      prepared.anagramIndicator
    );
    add(
      "no superfluous words",
      !superfluousErr,
      superfluousErr ?? "No superfluous words in definition or wordplay"
    );

    const telegraphErr = verifyNoTelegraphingPunctuation(
      prepared.clue,
      prepared.anagramFodder,
      prepared.anagramIndicator
    );
    add(
      "surface misdirection",
      !telegraphErr,
      telegraphErr ??
        "Punctuation misdirects rather than marking definition/wordplay boundaries"
    );

    const inClue = phraseAppearsAsFodderInClue(
      prepared.clue,
      prepared.anagramFodder
    );
    add(
      "fodder in clue",
      inClue,
      inClue
        ? `All fodder words from "${prepared.anagramFodder}" appear in the clue (spaces only between them)`
        : `Fodder "${prepared.anagramFodder}" is not valid in the clue — use every fodder word, any order, with only spaces between them`
    );

    const mismatch = anagramMismatchReason(
      prepared.anagramFodder,
      prepared.answer
    );
    add(
      "letter counts",
      !mismatch,
      mismatch ?? `Fodder letters match answer ${prepared.answer} exactly (each letter once)`
    );

    const trivial = trivialFodderReason(
      prepared.anagramFodder,
      prepared.answer
    );
    add(
      "letter mix",
      !trivial,
      trivial ?? "Fodder scrambles letters, not just word order"
    );

    const linkingErr = verifyLinkingWordCount(
      prepared.clue,
      prepared.anagramFodder
    );
    add(
      "linking words",
      !linkingErr,
      linkingErr ??
        `At most ${MAX_LINKING_WORDS} linking words between definition and wordplay`
    );

    const contractionErr = verifyClueContractionSpelling(prepared.clue);
    add(
      "contraction spelling",
      !contractionErr,
      contractionErr ?? "Contractions use apostrophes (That'd, not Thatd)"
    );
  }

  const anagramResult = verifyAnagram(
    prepared.clue,
    prepared.answer,
    prepared.anagramFodder
  );
  add(
    "anagram structure",
    anagramResult.ok,
    anagramResult.reason ?? "Anagram wordplay is valid"
  );

  return {
    ok: errors.length === 0,
    errors,
    checks,
    prepared,
  };
}
