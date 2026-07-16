import { answerLetterCount as countAnswerLetters, normalizeAnswer } from "./answer-format";
import {
  applyFodderCasingInClue,
  applyPlaceCasingInClue,
  formatFodderForClue,
  normalizeClueCapitalization,
  verifyClueCapitalizationRules,
} from "./proper-noun-casing";
import { isDictionaryFodder, fodderProperNameIssue } from "./fodder-quality";
import {
  restoreContractionsInClue,
  verifyClueContractionSpelling,
} from "./fodder-contractions";
import {
  MAX_LINKING_WORDS,
  verifyLinkingWordCount,
  extractDefinitionPhrase,
} from "./clue-surface-link";
import { verifyNoSuperfluousWords } from "./clue-surface-tightness";
import {
  fixEnumerationInClue,
  hasHomophoneIndicator,
  phraseAppearsAsFodderInClue,
  verifyAnswerNotStandalone,
  verifyEnumeration,
} from "./clue-verify";
import { stripEnumerationForLinking } from "./clue-surface-link";
import { getHomophonePartners, getStoredHomophoneDefinition } from "./db/homophones";
import {
  isVagueDefinition,
  verifyDefinitionNotVague,
  verifyDefinitionMatchesAnswer,
} from "./definition-quality";
import {
  isGenericPartOfSpeechHint,
  isSubstitutableHomophoneHint,
} from "./homophone-definitions";
import { normalizeHomophoneWord } from "./homophone-phonetics";
import { isDistinctHomophonePair } from "./homophone-variants";
import type { AnagramClueDraft, AnagramVerification } from "./types";

function normalizeDraft(raw: AnagramClueDraft): AnagramClueDraft {
  return {
    answer: normalizeAnswer(raw.answer ?? ""),
    clue: raw.clue?.trim() ?? "",
    anagramFodder: raw.anagramFodder?.trim() ?? "",
    definition: raw.definition?.trim(),
    homophoneHint: raw.homophoneHint?.trim(),
    anagramIndicator: raw.anagramIndicator?.trim(),
  };
}

function verifyHomophoneHintInClue(
  clue: string,
  homophoneHint: string
): string | null {
  const body = stripEnumerationForLinking(clue);
  if (body.toLowerCase().includes(homophoneHint.toLowerCase())) return null;
  return `Homophone hint "${homophoneHint}" is not present in the clue`;
}

function verifyHomophoneWordNotInSurface(
  clue: string,
  homophoneWord: string
): string | null {
  if (phraseAppearsAsFodderInClue(clue, homophoneWord)) {
    return `Homophone word "${homophoneWord}" must not appear literally in the clue — use a hint instead`;
  }
  return null;
}

function verifyIndicatorOnHomophoneSide(
  clue: string,
  homophoneHint: string,
  indicator: string
): string | null {
  const body = stripEnumerationForLinking(clue);
  const hintIdx = body.toLowerCase().indexOf(homophoneHint.toLowerCase());
  const indIdx = body.toLowerCase().indexOf(indicator.toLowerCase());
  if (hintIdx < 0) return `Homophone hint "${homophoneHint}" not found in clue`;
  if (indIdx < 0) return `Homophone indicator "${indicator}" not found in clue`;
  if (indIdx < hintIdx) {
    return "Homophone indicator must appear on the homophone (non-answer) side, after the homophone hint";
  }
  return null;
}

export function verifyHomophoneRelationship(
  answer: string,
  fodder: string
): { ok: boolean; reason?: string } {
  const answerWord = normalizeHomophoneWord(answer);
  const fodderWord = normalizeHomophoneWord(fodder);

  if (!answerWord || !fodderWord) {
    return { ok: false, reason: "Answer and homophone fodder must be valid words" };
  }

  if (answerWord === fodderWord) {
    return {
      ok: false,
      reason: "Homophone fodder must be spelled differently from the answer",
    };
  }

  const partners = getHomophonePartners(answerWord);
  if (!partners.includes(fodderWord)) {
    return {
      ok: false,
      reason: `"${fodder}" is not a registered homophone of "${answer}"`,
    };
  }

  if (!isDistinctHomophonePair(answerWord, fodderWord)) {
    return {
      ok: false,
      reason: `"${fodder}" is a spelling variant of "${answer}", not a distinct homophone`,
    };
  }

  return { ok: true };
}

export function prepareHomophoneClue(draft: AnagramClueDraft): AnagramClueDraft {
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

export interface HomophoneVerifyOptions {}

export function verifyHomophoneClue(
  draft: AnagramClueDraft,
  _options: HomophoneVerifyOptions = {}
): AnagramVerification {
  const prepared = prepareHomophoneClue(draft);
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
    add("homophoneFodder", false, "Homophone fodder is required");
  }

  const enumErr = verifyEnumeration(prepared.clue, prepared.answer);
  add(
    "enumeration",
    !enumErr,
    enumErr ?? `Enumeration matches answer length (${countAnswerLetters(prepared.answer)})`
  );

  const standaloneErr = verifyAnswerNotStandalone(
    prepared.clue,
    prepared.answer,
    false
  );
  add(
    "answerNotStandalone",
    !standaloneErr,
    standaloneErr ?? "Answer does not appear as a standalone word in the clue"
  );

  if (prepared.anagramFodder) {
    const homophoneCheck = verifyHomophoneRelationship(
      prepared.answer,
      prepared.anagramFodder
    );
    add(
      "homophoneRelationship",
      homophoneCheck.ok,
      homophoneCheck.ok
        ? `"${prepared.anagramFodder}" sounds like "${prepared.answer}"`
        : homophoneCheck.reason ?? "Invalid homophone pair"
    );

    if (prepared.homophoneHint) {
      const hintErr = verifyHomophoneHintInClue(
        prepared.clue,
        prepared.homophoneHint
      );
      add(
        "homophoneHintInClue",
        !hintErr,
        hintErr ?? "Homophone hint appears in the clue"
      );

      const literalErr = verifyHomophoneWordNotInSurface(
        prepared.clue,
        prepared.anagramFodder
      );
      add(
        "homophoneWordNotLiteral",
        !literalErr,
        literalErr ?? "Homophone word is not used literally in the clue surface"
      );
    } else if (!phraseAppearsAsFodderInClue(prepared.clue, prepared.anagramFodder)) {
      add(
        "homophoneFodderInClue",
        false,
        `Homophone fodder "${prepared.anagramFodder}" is not present in the clue`
      );
    } else {
      add("homophoneFodderInClue", true, "Homophone fodder appears in the clue");
    }

    if (!isDictionaryFodder(prepared.anagramFodder)) {
      add(
        "homophoneFodderDictionary",
        false,
        `Homophone fodder "${prepared.anagramFodder}" is not dictionary-valid`
      );
    } else {
      add("homophoneFodderDictionary", true, "Homophone fodder is dictionary-valid");
    }

    const properNameIssue = fodderProperNameIssue(prepared.anagramFodder);
    add(
      "homophoneFodderProperName",
      !properNameIssue,
      properNameIssue ?? "Homophone fodder proper-name casing is fair"
    );
  }

  add(
    "homophoneIndicator",
    hasHomophoneIndicator(prepared.clue),
    hasHomophoneIndicator(prepared.clue)
      ? "Clue contains a fair homophone indicator"
      : "Homophone clue lacks a fair sound indicator (e.g. we hear, reportedly, sounds like)"
  );

  if (prepared.homophoneHint && prepared.anagramIndicator) {
    const sideErr = verifyIndicatorOnHomophoneSide(
      prepared.clue,
      prepared.homophoneHint,
      prepared.anagramIndicator
    );
    add(
      "indicatorOnHomophoneSide",
      !sideErr,
      sideErr ?? "Homophone indicator is on the homophone (non-answer) side"
    );
  }

  const surfaceWord = prepared.homophoneHint ?? prepared.anagramFodder;
  const definitionPhrase =
    prepared.definition?.trim() ||
    extractDefinitionPhrase(
      prepared.clue,
      surfaceWord,
      prepared.anagramIndicator ?? ""
    );
  const definitionErr = verifyDefinitionMatchesAnswer(
    definitionPhrase,
    prepared.answer
  );
  add(
    "definitionMatchesAnswer",
    !definitionErr,
    definitionErr ?? "Definition matches the answer"
  );

  const vagueErr = verifyDefinitionNotVague(definitionPhrase);
  add("definitionNotVague", !vagueErr, vagueErr ?? "Definition is specific enough");

  if (prepared.homophoneHint) {
    const fodderWord = normalizeHomophoneWord(prepared.anagramFodder);
    const fodderDefinition = fodderWord
      ? getStoredHomophoneDefinition(fodderWord)?.definition
      : undefined;
    const homophoneHintVague = isVagueDefinition(prepared.homophoneHint)
      ? `Homophone hint "${prepared.homophoneHint}" is too vague — use a specific sense, not a generic placeholder`
      : isGenericPartOfSpeechHint(prepared.homophoneHint)
        ? `Homophone hint "${prepared.homophoneHint}" is a generic part-of-speech placeholder`
        : fodderWord &&
            !isSubstitutableHomophoneHint(
              prepared.homophoneHint,
              fodderWord,
              fodderDefinition
            )
          ? `Homophone hint "${prepared.homophoneHint}" is not substitutable for "${prepared.anagramFodder}" — use a true synonym, not a modifier from its definition`
          : null;
    add(
      "homophoneHintNotVague",
      !homophoneHintVague,
      homophoneHintVague ?? "Homophone hint is specific enough"
    );
  }

  const linkingErr = verifyLinkingWordCount(prepared.clue, surfaceWord);
  add(
    "linkingWords",
    !linkingErr,
    linkingErr ?? `Linking words within limit (max ${MAX_LINKING_WORDS})`
  );

  const tightnessErr = verifyNoSuperfluousWords(
    prepared.clue,
    surfaceWord,
    prepared.anagramIndicator ?? ""
  );
  add("surfaceTightness", !tightnessErr, tightnessErr ?? "No superfluous surface words");

  const contractionErr = verifyClueContractionSpelling(prepared.clue);
  add("contractions", !contractionErr, contractionErr ?? "Contractions are spelled fairly");

  const capitalizationErr = verifyClueCapitalizationRules(prepared.clue);
  add(
    "capitalization",
    !capitalizationErr,
    capitalizationErr ?? "Capitalization follows clue conventions"
  );

  return { ok: errors.length === 0, errors, checks, prepared };
}
