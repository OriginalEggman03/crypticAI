export interface UsedAnagramClue {
  answer: string;
  anagramFodder: string;
  clue: string;
  anagramIndicator?: string;
}

export type AnagramDifficulty = "easy" | "hard";

export interface UserPublic {
  id: number;
  email: string;
  emailVerified: boolean;
}

export interface CreditsStatus {
  freeRemaining: number;
  paidCredits: number;
  canGenerate: boolean;
  /** True for the hardcoded admin test account — spins are never consumed. */
  adminUnlimited?: boolean;
}

export interface AuthMeResponse {
  user: UserPublic;
  credits: CreditsStatus;
}

export interface SignupResponse {
  needsEmailVerification: true;
  email: string;
}

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

export interface AnagramRequest {
  inspiration: string;
  /** Easy: 3–10 letters. Hard: min 8 letters, no max. */
  difficulty?: AnagramDifficulty;
  /** Clues already shown for this inspiration — retry must produce something new. */
  exclude?: UsedAnagramClue[];
}

export interface AnagramClueDraft {
  answer: string;
  clue: string;
  anagramFodder: string;
  definition?: string;
  anagramIndicator?: string;
}

export interface AnagramVerificationCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface AnagramVerification {
  ok: boolean;
  errors: string[];
  checks: AnagramVerificationCheck[];
  prepared: AnagramClueDraft;
}

export interface PromptTurn {
  system: string;
  user: string;
  response?: string;
}

/** One Anthropic Messages API call, in chronological order. */
export interface ClaudeCallTrace {
  order: number;
  label: string;
  system: string;
  user: string;
  response?: string;
}

export interface AnswerContext {
  dictionaryDefinition: string;
  partOfSpeech?: string;
  topicRelation: string;
}

export interface ClueSurfaceExplanation {
  definition: string;
  wordplay: string;
  linkingWords?: string;
  walkthrough: string;
}

export type AnagramStrategy =
  | "programmatic-surface"
  | "template-polish"
  | "indicator-refine"
  | "claude-ranked-pair";

export interface AnagramClueResult {
  /** Effective theme for this clue (user-supplied or auto-picked). */
  inspiration: string;
  /** True when inspiration was chosen because the user left the field blank. */
  autoThemed?: boolean;
  clue: AnagramClueDraft;
  verified: true;
  verification: AnagramVerification;
  answerContext?: AnswerContext;
  surfaceExplanation?: ClueSurfaceExplanation;
  attempts: number;
  strategy: AnagramStrategy;
  difficulty: AnagramDifficulty;
  /** Successful Anthropic Messages API calls during clue generation. */
  llmCalls: number;
  /** Every Claude call during generation, in the order it was made. Admin only. */
  claudeTrace?: ClaudeCallTrace[];
  /** Exact prompts sent to Claude. Admin only. */
  prompts?: {
    setter: PromptTurn;
    repairs: PromptTurn[];
    surface: PromptTurn[];
    answer: PromptTurn[];
    pairSelect: PromptTurn[];
    templatePolish: PromptTurn[];
    indicatorRefine: PromptTurn[];
    hotIndicatorSwap: PromptTurn[];
  };
}

export interface AnagramApiResponse {
  result?: AnagramClueResult;
  credits?: CreditsStatus;
  error?: string;
}

/** @deprecated Legacy crossword flow — app now uses AnagramRequest */
export interface UserPreferences {
  inspiration: string;
  clueType?: string;
}
export interface ClueExplanation {
  clueType: string;
  definition: string;
  wordplay: string;
  parts: { text: string; role: string }[];
  walkthrough: string;
}

export interface PuzzleEntry {
  id: string;
  answer: string;
  clue: string;
  clueType?: string;
  anagramFodder?: string | null;
}

export interface PlacedEntry extends PuzzleEntry {
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

export interface GridCell {
  letter: string | null;
  block: boolean;
  number: number | null;
  acrossId: string | null;
  downId: string | null;
}

export interface CrosswordPuzzle {
  title: string;
  subtitle: string;
  entries: PlacedEntry[];
  grid: GridCell[][];
  width: number;
  height: number;
}

export interface GenerateResponse {
  title: string;
  subtitle: string;
  entries: {
    answer: string;
    clue: string;
    clueType: string;
    anagramFodder?: string | null;
  }[];
}
